import { useEffect, useMemo, useRef } from 'react';
import { Layer, Rect, Shape, Stage, Text, Transformer, Image as KImage } from 'react-konva';
import type Konva from 'konva';
import type { Garment, OutfitScene, SceneItem } from '../../types';
import { useHtmlImage, useImageUrl } from '../../components/useImageUrl';
import { mannequinUrl, type MannequinId } from '../mannequin-studio/mannequins';
import { CANVAS_W, sceneHeight } from './layouts';

interface NodeProps {
  item: SceneItem;
  garment: Garment;
  snap: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<SceneItem>) => void;
  register: (id: string, node: Konva.Shape | null) => void;
}

function GarmentNode({ item, garment, snap, onSelect, onChange, register }: NodeProps) {
  const url = useImageUrl(garment.imageId);
  const img = useHtmlImage(url);
  const { width: w, height: h } = item;

  return (
    <Shape
      ref={(n) => register(item.garmentId, n)}
      x={item.x}
      y={item.y}
      width={w}
      height={h}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={item.rotation}
      opacity={item.opacity}
      visible={!item.hidden}
      draggable
      shadowColor="#000"
      shadowBlur={22}
      shadowOpacity={0.2}
      shadowOffsetY={9}
      fill={garment.primaryColor}
      onClick={() => onSelect(item.garmentId)}
      onTap={() => onSelect(item.garmentId)}
      onDragStart={() => onSelect(item.garmentId)}
      onDragMove={(e) => {
        if (!snap) return;
        e.target.x(Math.round(e.target.x() / 25) * 25);
        e.target.y(Math.round(e.target.y() / 25) * 25);
      }}
      onDragEnd={(e) => onChange(item.garmentId, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const nw = Math.max(30, node.width() * node.scaleX());
        const nh = Math.max(30, node.height() * node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onChange(item.garmentId, { x: node.x(), y: node.y(), width: nw, height: nh, rotation: node.rotation() });
      }}
      sceneFunc={(ctx, shape) => {
        if (!img) {
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
          return;
        }
        ctx.save();
        if (item.flipX) {
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
        }
        if (item.open) {
          ctx.beginPath();
          ctx.rect(0, 0, w * 0.36, h);
          ctx.rect(w * 0.64, 0, w * 0.36, h);
          ctx.closePath();
          ctx.clip();
        }
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

export interface StudioCanvasProps {
  scene: OutfitScene;
  garments: Map<string, Garment>;
  displayWidth: number;
  selectedId?: string;
  snap: boolean;
  capturing: boolean;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  onSelect: (id?: string) => void;
  onChange: (id: string, patch: Partial<SceneItem>) => void;
}

export default function StudioCanvas({ scene, garments, displayWidth, selectedId, snap, capturing, stageRef, onSelect, onChange }: StudioCanvasProps) {
  const H = sceneHeight(scene);
  const scale = displayWidth / CANVAS_W;
  const nodes = useRef(new Map<string, Konva.Shape>());
  const tr = useRef<Konva.Transformer>(null);
  const mannequin = useHtmlImage(scene.mode === 'mannequin' ? mannequinUrl(scene.templateId as MannequinId) : undefined);

  const sorted = useMemo(() => [...scene.items].sort((a, b) => a.zIndex - b.zIndex), [scene.items]);

  useEffect(() => {
    const t = tr.current;
    if (!t) return;
    const node = selectedId && !capturing ? nodes.current.get(selectedId) : undefined;
    t.nodes(node ? [node] : []);
    t.getLayer()?.batchDraw();
  }, [selectedId, capturing, scene.items]);

  const dark = isDark(scene.background);

  return (
    <Stage
      ref={stageRef}
      width={displayWidth}
      height={H * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => e.target === e.target.getStage() && onSelect(undefined)}
      onTouchStart={(e) => e.target === e.target.getStage() && onSelect(undefined)}
    >
      <Layer>
        <Rect x={0} y={0} width={CANVAS_W} height={H} fill={scene.background} onMouseDown={() => onSelect(undefined)} onTap={() => onSelect(undefined)} />
        <Rect
          x={0}
          y={0}
          width={CANVAS_W}
          height={H}
          listening={false}
          fillRadialGradientStartPoint={{ x: CANVAS_W / 2, y: H / 2 }}
          fillRadialGradientEndPoint={{ x: CANVAS_W / 2, y: H / 2 }}
          fillRadialGradientStartRadius={H * 0.25}
          fillRadialGradientEndRadius={H * 0.85}
          fillRadialGradientColorStops={[0, 'rgba(255,255,255,0.0)', 1, dark ? 'rgba(0,0,0,0.28)' : 'rgba(60,45,25,0.10)']}
        />
        {scene.mode === 'mannequin' && mannequin && <KImage image={mannequin} x={0} y={0} width={CANVAS_W} height={H} listening={false} />}
        {sorted.map((it) => {
          const g = garments.get(it.garmentId);
          return g ? <GarmentNode key={it.garmentId} item={it} garment={g} snap={snap} onSelect={onSelect} onChange={onChange} register={(id, n) => (n ? nodes.current.set(id, n) : nodes.current.delete(id))} /> : null;
        })}
        {scene.signature !== false && (
          <Text
            x={0}
            y={H - 40}
            width={CANVAS_W}
            align="center"
            text="A T E L I E R"
            fontFamily="Cormorant Garamond, Georgia, serif"
            fontSize={22}
            fill={dark ? '#F4F0E8' : '#171715'}
            opacity={0.38}
            listening={false}
          />
        )}
        {!capturing && (
          <Transformer
            ref={tr}
            rotateEnabled
            keepRatio
            anchorSize={24}
            anchorCornerRadius={12}
            anchorStroke="#9C8060"
            anchorFill="#F4F0E8"
            borderStroke="#9C8060"
            borderDash={[6, 4]}
            rotateAnchorOffset={36}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 40 || newBox.height < 40 ? oldBox : newBox)}
          />
        )}
      </Layer>
    </Stage>
  );
}

function isDark(hex: string): boolean {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 110;
}
