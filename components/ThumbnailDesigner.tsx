"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Layer, Rect, Stage, Text as KonvaText } from "react-konva";
import useImage from "use-image";
import { Image as KonvaImage, Transformer } from "react-konva";
import clsx from "clsx";
import { useHotkeys } from "react-hotkeys-hook";
import type Konva from "konva";

type BackgroundMode = "solid" | "gradient";

type CanvasConfig = {
  width: number;
  height: number;
  backgroundMode: BackgroundMode;
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  showGrid: boolean;
  showSafeZone: boolean;
};

type ShadowSettings = {
  color: string;
  blur: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
};

type TextLayer = {
  id: string;
  type: "text";
  label: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: "normal" | "bold";
  fill: string;
  stroke: string;
  strokeWidth: number;
  align: "left" | "center" | "right";
  uppercase: boolean;
  rotation: number;
  shadow: ShadowSettings;
  x: number;
  y: number;
};

type ImageLayer = {
  id: string;
  type: "image";
  label: string;
  src: string;
  scale: number;
  rotation: number;
  opacity: number;
  x: number;
  y: number;
  shadow: ShadowSettings;
};

type Selection = {
  type: "text" | "image";
  id: string;
} | null;

type LayerUnion = TextLayer | ImageLayer;

const FONT_FAMILIES = [
  { label: "Anton (Bold)", value: "Anton", defaultSize: 84 },
  { label: "Bebas Neue", value: "Bebas Neue", defaultSize: 96 },
  { label: "Impact", value: "Impact", defaultSize: 88 },
  { label: "Oswald", value: "Oswald", defaultSize: 76 },
  { label: "Montserrat", value: "Montserrat", defaultSize: 64 }
];

const DEFAULT_SHADOW: ShadowSettings = {
  color: "#000000",
  blur: 20,
  opacity: 0.6,
  offsetX: 8,
  offsetY: 8
};

function gradientPoints(angle: number, width: number, height: number) {
  const radians = (angle * Math.PI) / 180;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const diagonal = Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);

  return {
    start: {
      x: halfWidth - diagonal * cos,
      y: halfHeight - diagonal * sin
    },
    end: {
      x: halfWidth + diagonal * cos,
      y: halfHeight + diagonal * sin
    }
  };
}

function useKonvaImage(src: string) {
  const [image] = useImage(src, "anonymous");
  return image;
}

function ImageLayerNode({
  layer,
  isSelected,
  onSelect,
  onChange
}: {
  layer: ImageLayer;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (next: ImageLayer) => void;
}) {
  const image = useKonvaImage(layer.src);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const imageNode = shapeRef.current;
    const transformer = trRef.current;
    if (isSelected && imageNode && transformer) {
      transformer.nodes([imageNode]);
      transformer.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      ...layer,
      x: event.target.x(),
      y: event.target.y()
    });
  };

  return (
    <>
      <KonvaImage
        image={image as HTMLImageElement}
        x={layer.x}
        y={layer.y}
        opacity={layer.opacity}
        rotation={layer.rotation}
        draggable
        scale={{ x: layer.scale, y: layer.scale }}
        shadowColor={layer.shadow.color}
        shadowBlur={layer.shadow.blur}
        shadowOpacity={layer.shadow.opacity}
        shadowOffsetX={layer.shadow.offsetX}
        shadowOffsetY={layer.shadow.offsetY}
        ref={shapeRef}
        onDragEnd={handleDragEnd}
        onClick={onSelect}
        onTap={onSelect}
        onTransformEnd={() => {
          if (!shapeRef.current) return;
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          onChange({
            ...layer,
            scale: scaleX,
            rotation: node.rotation(),
            x: node.x(),
            y: node.y()
          });
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = "move";
          }
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = "default";
          }
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 50 || newBox.height < 50) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

function TextLayerNode({
  layer,
  isSelected,
  onSelect,
  onChange
}: {
  layer: TextLayer;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (next: TextLayer) => void;
}) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      ...layer,
      x: event.target.x(),
      y: event.target.y()
    });
  };

  useEffect(() => {
    const textNode = shapeRef.current;
    const transformer = trRef.current;
    if (isSelected && textNode && transformer) {
      transformer.nodes([textNode]);
      transformer.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaText
        ref={shapeRef}
        text={layer.uppercase ? layer.text.toUpperCase() : layer.text}
        x={layer.x}
        y={layer.y}
        draggable
        fontSize={layer.fontSize}
        fontFamily={layer.fontFamily}
        fontStyle={layer.fontStyle}
        fill={layer.fill}
        align={layer.align}
        shadowColor={layer.shadow.color}
        shadowBlur={layer.shadow.blur}
        shadowOpacity={layer.shadow.opacity}
        shadowOffsetX={layer.shadow.offsetX}
        shadowOffsetY={layer.shadow.offsetY}
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth}
        rotation={layer.rotation}
        onDragEnd={handleDragEnd}
        onClick={onSelect}
        onTap={onSelect}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scale = node.scaleX();
          onChange({
            ...layer,
            fontSize: Math.max(10, layer.fontSize * scale),
            x: node.x(),
            y: node.y(),
            rotation: node.rotation()
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "default";
        }}
        padding={4}
        listening
        perfectDrawEnabled={false}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 80 || newBox.height < 40) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default function ThumbnailDesigner() {
  const stageRef = useRef<Konva.Stage>(null);
  const [previewScale, setPreviewScale] = useState(0.45);
  const [config, setConfig] = useState<CanvasConfig>({
    width: 1280,
    height: 720,
    backgroundMode: "gradient",
    solidColor: "#111827",
    gradientStart: "#ff0033",
    gradientEnd: "#ffd300",
    gradientAngle: 32,
    showGrid: true,
    showSafeZone: true
  });
  const [textLayers, setTextLayers] = useState<TextLayer[]>([
    {
      id: crypto.randomUUID(),
      type: "text",
      label: "Primary Title",
      text: "KILLER THUMBNAILS",
      fontFamily: "Anton",
      fontSize: 168,
      fontStyle: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 4,
      align: "left",
      uppercase: true,
      rotation: 0,
      shadow: DEFAULT_SHADOW,
      x: 140,
      y: 180
    }
  ]);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [selection, setSelection] = useState<Selection>(null);

  const selectedLayer: LayerUnion | undefined = useMemo(() => {
    if (!selection) return undefined;
    if (selection.type === "text") {
      return textLayers.find((layer) => layer.id === selection.id);
    }
    return imageLayers.find((layer) => layer.id === selection.id);
  }, [selection, textLayers, imageLayers]);

  useHotkeys(
    "delete,backspace",
    () => {
      if (!selection) return;
      if (selection.type === "text") {
        setTextLayers((current) => current.filter((layer) => layer.id !== selection.id));
      } else {
        setImageLayers((current) => current.filter((layer) => layer.id !== selection.id));
      }
      setSelection(null);
    },
    [selection]
  );

  useHotkeys(
    "mod+d",
    () => {
      if (!selectedLayer) return;
      if (selectedLayer.type === "text") {
        const clone: TextLayer = {
          ...selectedLayer,
          id: crypto.randomUUID(),
          label: `${selectedLayer.label} Copy`,
          x: selectedLayer.x + 40,
          y: selectedLayer.y + 40
        };
        setTextLayers((layers) => [...layers, clone]);
        setSelection({ type: "text", id: clone.id });
      } else {
        const clone: ImageLayer = {
          ...selectedLayer,
          id: crypto.randomUUID(),
          label: `${selectedLayer.label} Copy`,
          x: selectedLayer.x + 40,
          y: selectedLayer.y + 40
        };
        setImageLayers((layers) => [...layers, clone]);
        setSelection({ type: "image", id: clone.id });
      }
    },
    [selectedLayer]
  );

  const updateTextLayer = useCallback((id: string, updater: (layer: TextLayer) => TextLayer) => {
    setTextLayers((layers) => layers.map((layer) => (layer.id === id ? updater(layer) : layer)));
  }, []);

  const updateImageLayer = useCallback((id: string, updater: (layer: ImageLayer) => ImageLayer) => {
    setImageLayers((layers) => layers.map((layer) => (layer.id === id ? updater(layer) : layer)));
  }, []);

  const handleAddText = () => {
    const font = FONT_FAMILIES[0];
    const id = crypto.randomUUID();
    const newLayer: TextLayer = {
      id,
      type: "text",
      label: "New Text",
      text: "New Hook",
      fontFamily: font.value,
      fontSize: font.defaultSize,
      fontStyle: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 4,
      align: "center",
      uppercase: true,
      rotation: 0,
      shadow: DEFAULT_SHADOW,
      x: config.width / 3,
      y: config.height / 2
    };
    setTextLayers((layers) => [...layers, newLayer]);
    setSelection({ type: "text", id });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = crypto.randomUUID();
      const src = reader.result as string;
      const newLayer: ImageLayer = {
        id,
        type: "image",
        label: file.name.replace(/\.[^.]+$/, ""),
        src,
        scale: 0.6,
        rotation: 0,
        opacity: 1,
        x: config.width / 2,
        y: config.height / 2,
        shadow: { ...DEFAULT_SHADOW, opacity: 0.4 }
      };
      setImageLayers((layers) => [...layers, newLayer]);
      setSelection({ type: "image", id });
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });
    const link = document.createElement("a");
    link.download = `thumbnail-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const backgroundRect = useMemo(() => {
    if (config.backgroundMode === "solid") {
      return (
        <Rect
          x={0}
          y={0}
          width={config.width}
          height={config.height}
          fill={config.solidColor}
        />
      );
    }

    const { start, end } = gradientPoints(config.gradientAngle, config.width, config.height);
    return (
      <Rect
        x={0}
        y={0}
        width={config.width}
        height={config.height}
        fillLinearGradientStartPoint={start}
        fillLinearGradientEndPoint={end}
        fillLinearGradientColorStops={[0, config.gradientStart, 1, config.gradientEnd]}
      />
    );
  }, [config]);

  const gridLines = useMemo(() => {
    if (!config.showGrid) return null;
    const spacing = 120;
    const verticalLines = Array.from({ length: Math.floor(config.width / spacing) })
      .map((_, index) => (index + 1) * spacing)
      .filter((x) => x < config.width);
    const horizontalLines = Array.from({ length: Math.floor(config.height / spacing) })
      .map((_, index) => (index + 1) * spacing)
      .filter((y) => y < config.height);

    return (
      <Layer listening={false}>
        {verticalLines.map((x) => (
          <Rect key={`v-${x}`} x={x} y={0} width={1} height={config.height} fill="rgba(148, 163, 184, 0.16)" />
        ))}
        {horizontalLines.map((y) => (
          <Rect key={`h-${y}`} x={0} y={y} width={config.width} height={1} fill="rgba(148, 163, 184, 0.16)" />
        ))}
      </Layer>
    );
  }, [config]);

  const safeZoneRect = useMemo(() => {
    if (!config.showSafeZone) return null;
    const paddingX = config.width * 0.08;
    const paddingY = config.height * 0.08;
    return (
      <Rect
        x={paddingX}
        y={paddingY}
        width={config.width - paddingX * 2}
        height={config.height - paddingY * 2}
        stroke="rgba(248, 250, 252, 0.35)"
        dash={[20, 16]}
        strokeWidth={4}
        listening={false}
      />
    );
  }, [config]);

  const canvasStyle = {
    width: config.width * previewScale,
    height: config.height * previewScale
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)_320px] xl:gap-10">
      <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/40 p-6 backdrop-blur">
        <section className="space-y-4">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-secondary">
              Canvas
            </p>
            <h2 className="text-2xl font-bold text-white">Thumbnail Settings</h2>
          </header>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Width
              <input
                type="number"
                min={640}
                max={3840}
                value={config.width}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, width: Number(event.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none"
              />
            </label>
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Height
              <input
                type="number"
                min={360}
                max={2160}
                value={config.height}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, height: Number(event.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none"
              />
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={clsx(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
                  config.backgroundMode === "solid"
                    ? "bg-brand-primary text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300"
                )}
                onClick={() => setConfig((prev) => ({ ...prev, backgroundMode: "solid" }))}
              >
                Solid Fill
              </button>
              <button
                type="button"
                className={clsx(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
                  config.backgroundMode === "gradient"
                    ? "bg-brand-primary text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300"
                )}
                onClick={() => setConfig((prev) => ({ ...prev, backgroundMode: "gradient" }))}
              >
                Gradient Fill
              </button>
            </div>
            {config.backgroundMode === "solid" ? (
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Solid Color
                <input
                  type="color"
                  value={config.solidColor}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, solidColor: event.target.value }))
                  }
                  className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900"
                />
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Start
                  <input
                    type="color"
                    value={config.gradientStart}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, gradientStart: event.target.value }))
                    }
                    className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900"
                  />
                </label>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  End
                  <input
                    type="color"
                    value={config.gradientEnd}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, gradientEnd: event.target.value }))
                    }
                    className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900"
                  />
                </label>
                <label className="col-span-2 text-xs uppercase tracking-wide text-slate-400">
                  Angle ({config.gradientAngle}°)
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={config.gradientAngle}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, gradientAngle: Number(event.target.value) }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, showGrid: event.target.checked }))
                }
                className="h-4 w-4 accent-brand-secondary"
              />
              Grid overlay
            </label>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={config.showSafeZone}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, showSafeZone: event.target.checked }))
                }
                className="h-4 w-4 accent-brand-secondary"
              />
              Safe zone
            </label>
          </div>
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Zoom ({Math.round(previewScale * 100)}%)
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={previewScale}
              onChange={(event) => setPreviewScale(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </section>

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
                Layers
              </p>
              <h3 className="text-lg font-semibold text-white">Text</h3>
            </div>
            <button
              type="button"
              onClick={handleAddText}
              className="rounded-full bg-brand-primary px-3 py-1 text-sm font-semibold text-white shadow-lg shadow-brand-primary/40 transition hover:scale-105"
            >
              + Text
            </button>
          </header>
          <div className="space-y-3">
            {textLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelection({ type: "text", id: layer.id })}
                className={clsx(
                  "w-full rounded-xl border border-transparent bg-slate-900/70 px-3 py-2 text-left transition hover:border-slate-700",
                  selection?.id === layer.id && selection?.type === "text" &&
                    "border-brand-secondary bg-slate-800/80"
                )}
              >
                <p className="text-sm font-semibold text-white">{layer.label}</p>
                <p className="text-xs text-slate-400 line-clamp-1">{layer.text}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
                Layers
              </p>
              <h3 className="text-lg font-semibold text-white">Imagery</h3>
            </div>
            <label className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200 shadow-inner transition hover:bg-slate-700">
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </header>
          <div className="space-y-3">
            {imageLayers.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-400">
                Drop in high-contrast cut-outs of faces or key objects. Use PNGs with transparent
                backgrounds for best results.
              </p>
            )}
            {imageLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelection({ type: "image", id: layer.id })}
                className={clsx(
                  "w-full rounded-xl border border-transparent bg-slate-900/70 px-3 py-2 text-left transition hover:border-slate-700",
                  selection?.id === layer.id && selection?.type === "image" &&
                    "border-brand-secondary bg-slate-800/80"
                )}
              >
                <p className="text-sm font-semibold text-white">{layer.label}</p>
                <p className="text-xs text-slate-400">Scale {Math.round(layer.scale * 100)}%</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
              Output
            </p>
            <h3 className="text-lg font-semibold text-white">Export</h3>
          </header>
          <button
            type="button"
            onClick={handleExport}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-brand-primary/30 transition hover:scale-[1.02]"
          >
            Download PNG
          </button>
          <p className="text-xs text-slate-400">
            Exported PNG is 1280×720 by default. Adjust dimensions above for high-resolution
            variants such as 4K.
          </p>
        </section>
      </div>

      <div className="flex flex-col items-center justify-center">
        <div
          className="relative rounded-3xl border border-slate-800 bg-slate-900/50 p-4 shadow-2xl shadow-black/40"
          style={canvasStyle}
        >
          <Stage
            width={config.width}
            height={config.height}
            scale={{ x: previewScale, y: previewScale }}
            ref={stageRef}
            className="rounded-2xl"
          >
            <Layer>{backgroundRect}</Layer>
            {gridLines}
            <Layer>
              {imageLayers.map((layer) => (
                <ImageLayerNode
                  key={layer.id}
                  layer={layer}
                  isSelected={selection?.type === "image" && selection.id === layer.id}
                  onSelect={() => setSelection({ type: "image", id: layer.id })}
                  onChange={(next) => updateImageLayer(layer.id, () => next)}
                />
              ))}
            </Layer>
            <Layer>
              {textLayers.map((layer) => (
                <TextLayerNode
                  key={layer.id}
                  layer={layer}
                  isSelected={selection?.type === "text" && selection.id === layer.id}
                  onSelect={() => setSelection({ type: "text", id: layer.id })}
                  onChange={(next) => updateTextLayer(layer.id, () => next)}
                />
              ))}
            </Layer>
            <Layer listening={false}>{safeZoneRect}</Layer>
          </Stage>
        </div>
      </div>

      <aside className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/40 p-6 backdrop-blur">
        <section className="space-y-3">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
              Guidance
            </p>
            <h3 className="text-lg font-semibold text-white">High-Impact Formula</h3>
          </header>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="rounded-xl border border-transparent bg-slate-900/70 px-3 py-2">
              <span className="font-semibold text-white">Contrast:</span> Aim for 60%+ contrast between
              text and background; use strokes or drop-shadows to keep words legible on mobile.
            </li>
            <li className="rounded-xl border border-transparent bg-slate-900/70 px-3 py-2">
              <span className="font-semibold text-white">Faces & Emotion:</span> Close-up facial
              expressions outperform wide shots; exaggerate emotion for faster recognition.
            </li>
            <li className="rounded-xl border border-transparent bg-slate-900/70 px-3 py-2">
              <span className="font-semibold text-white">Action Words:</span> Use 3–5 punchy words;
              complement video title but avoid duplicates.
            </li>
            <li className="rounded-xl border border-transparent bg-slate-900/70 px-3 py-2">
              <span className="font-semibold text-white">Rule of Thirds:</span> Align key subjects to
              intersection points; keep top-right clear for timestamp overlay.
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
              Motifs
            </p>
            <h3 className="text-lg font-semibold text-white">Preset Palettes</h3>
          </header>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
            {[
              { name: "Energy", start: "#ff0033", end: "#ffb347" },
              { name: "Tech", start: "#0ea5e9", end: "#22d3ee" },
              { name: "Mystery", start: "#6366f1", end: "#0f172a" },
              { name: "Success", start: "#22c55e", end: "#facc15" }
            ].map((palette) => (
              <button
                key={palette.name}
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    backgroundMode: "gradient",
                    gradientStart: palette.start,
                    gradientEnd: palette.end
                  }))
                }
                className="flex flex-col items-start rounded-2xl border border-transparent bg-slate-900/80 p-3 transition hover:border-slate-700"
              >
                <span className="text-xs uppercase tracking-wide text-slate-400">{palette.name}</span>
                <span
                  className="mt-2 h-10 w-full rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${palette.start}, ${palette.end})`
                  }}
                />
              </button>
            ))}
          </div>
        </section>
        {selectedLayer && (
          <section className="space-y-3">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
                Inspector
              </p>
              <h3 className="text-lg font-semibold text-white">{selectedLayer.label}</h3>
            </header>
            {selectedLayer.type === "text" ? (
              <div className="space-y-4 text-sm text-slate-200">
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Copy
                  <textarea
                    value={selectedLayer.text}
                    onChange={(event) =>
                      updateTextLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        text: event.target.value
                      }))
                    }
                    className="mt-2 h-24 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none"
                  />
                </label>
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Font
                  <select
                    value={selectedLayer.fontFamily}
                    onChange={(event) =>
                      updateTextLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        fontFamily: event.target.value
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none"
                  >
                    {FONT_FAMILIES.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Size ({Math.round(selectedLayer.fontSize)})
                  <input
                    type="range"
                    min={24}
                    max={260}
                    value={selectedLayer.fontSize}
                    onChange={(event) =>
                      updateTextLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        fontSize: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Fill
                    <input
                      type="color"
                      value={selectedLayer.fill}
                      onChange={(event) =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          fill: event.target.value
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900"
                    />
                  </label>
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Stroke
                    <input
                      type="color"
                      value={selectedLayer.stroke}
                      onChange={(event) =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          stroke: event.target.value
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-lg border border-slate-700 bg-slate-900"
                    />
                  </label>
                </div>
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Stroke Weight ({selectedLayer.strokeWidth}px)
                  <input
                    type="range"
                    min={0}
                    max={12}
                    value={selectedLayer.strokeWidth}
                    onChange={(event) =>
                      updateTextLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        strokeWidth: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          align
                        }))
                      }
                      className={clsx(
                        "rounded-lg border px-3 py-2 font-semibold uppercase tracking-wide",
                        selectedLayer.align === align
                          ? "border-brand-secondary text-brand-secondary"
                          : "border-slate-700 text-slate-400"
                      )}
                    >
                      {align}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedLayer.uppercase}
                      onChange={(event) =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          uppercase: event.target.checked
                        }))
                      }
                      className="h-4 w-4 accent-brand-secondary"
                    />
                    Uppercase
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedLayer.fontStyle === "bold"}
                      onChange={(event) =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          fontStyle: event.target.checked ? "bold" : "normal"
                        }))
                      }
                      className="h-4 w-4 accent-brand-secondary"
                    />
                    Bold Weight
                  </label>
                </div>
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Rotation ({Math.round(selectedLayer.rotation)}°)
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={selectedLayer.rotation}
                    onChange={(event) =>
                      updateTextLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        rotation: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <label className="space-y-1">
                    Shadow Strength
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedLayer.shadow.opacity}
                      onChange={(event) =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          shadow: {
                            ...layer.shadow,
                            opacity: Number(event.target.value)
                          }
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    Shadow Blur
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={selectedLayer.shadow.blur}
                      onChange={(event) =>
                        updateTextLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          shadow: {
                            ...layer.shadow,
                            blur: Number(event.target.value)
                          }
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-slate-200">
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Opacity ({Math.round(selectedLayer.opacity * 100)}%)
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={selectedLayer.opacity}
                    onChange={(event) =>
                      updateImageLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        opacity: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Scale ({Math.round(selectedLayer.scale * 100)}%)
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.05}
                    value={selectedLayer.scale}
                    onChange={(event) =>
                      updateImageLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        scale: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Rotation ({Math.round(selectedLayer.rotation)}°)
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    value={selectedLayer.rotation}
                    onChange={(event) =>
                      updateImageLayer(selectedLayer.id, (layer) => ({
                        ...layer,
                        rotation: Number(event.target.value)
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <label className="space-y-1">
                    Shadow
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedLayer.shadow.opacity}
                      onChange={(event) =>
                        updateImageLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          shadow: {
                            ...layer.shadow,
                            opacity: Number(event.target.value)
                          }
                        }))
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    Blur
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={selectedLayer.shadow.blur}
                      onChange={(event) =>
                        updateImageLayer(selectedLayer.id, (layer) => ({
                          ...layer,
                          shadow: {
                            ...layer.shadow,
                            blur: Number(event.target.value)
                          }
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </section>
        )}
        <section className="space-y-3 text-sm text-slate-300">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary">
              Keyboard
            </p>
            <h3 className="text-lg font-semibold text-white">Shortcuts</h3>
          </header>
          <ul className="space-y-2">
            <li className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <span>Duplicate layer</span>
              <code className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100">⌘/Ctrl + D</code>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
              <span>Delete layer</span>
              <code className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-100">Delete</code>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
