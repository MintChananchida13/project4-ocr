"use client";

import React, { useRef, useMemo } from 'react';
import { 
  RotateCw, Crop, Check, RefreshCw, Minus, Plus, Scissors, 
  ChevronLeft, ChevronRight, Maximize2, Sparkles, FlipHorizontal, FlipVertical
} from 'lucide-react';
import { Rnd } from 'react-rnd';

interface PageConfig {
  rotation: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  perspectiveV: number;
  perspectiveH: number;
  flipH: boolean;
  flipV: boolean;
  cropBox: { x: number; y: number; width: number; height: number } | null;
  isCropActive: boolean;
  isCropped: boolean;
  croppedLocalUrl: string | null;
}

interface AdjustZoneProps {
  imagesList: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  pagesConfig: PageConfig[];
  setPagesConfig: React.Dispatch<React.SetStateAction<PageConfig[]>>;
  onBatchConfirm: (finalImages: string[]) => void;
}

const DEFAULT_CONFIG: PageConfig = {
  rotation: 0,
  brightness: 100,
  contrast: 100,
  sharpness: 0,
  perspectiveV: 0,
  perspectiveH: 0,
  flipH: false,
  flipV: false,
  cropBox: null,
  isCropActive: false,
  isCropped: false,
  croppedLocalUrl: null
};

export default function AdjustZone({
  imagesList,
  currentIndex,
  onIndexChange,
  pagesConfig,
  setPagesConfig,
  onBatchConfirm,
}: AdjustZoneProps) {
  
  const currentRawUrl = imagesList[currentIndex] || "";
  const localImageRef = useRef<HTMLImageElement | null>(null);

  const currentConfig = useMemo(() => {
    return pagesConfig[currentIndex] || { ...DEFAULT_CONFIG };
  }, [pagesConfig, currentIndex]);

  const { 
    rotation, brightness, contrast, sharpness, 
    perspectiveV, perspectiveH, flipH, flipV,
    cropBox, isCropActive, isCropped, croppedLocalUrl 
  } = currentConfig;

  const updateCurrentConfig = (fields: Partial<PageConfig>) => {
    setPagesConfig(prev => {
      const updated = [...prev];
      if (!updated[currentIndex]) {
        updated[currentIndex] = { ...DEFAULT_CONFIG, ...fields };
      } else {
        updated[currentIndex] = { ...updated[currentIndex], ...fields };
      }
      return updated;
    });
  };

  const generateCroppedImage = (imgEl: HTMLImageElement | null): string | null => {
    if (!imgEl) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const naturalWidth = imgEl.naturalWidth;
    const naturalHeight = imgEl.naturalHeight;
    const renderedWidth = imgEl.clientWidth;
    const renderedHeight = imgEl.clientHeight;

    const imgRatio = naturalWidth / naturalHeight;
    const containerRatio = renderedWidth / renderedHeight;
    
    let displayedImgWidth = renderedWidth;
    let displayedImgHeight = renderedHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgRatio > containerRatio) {
      displayedImgHeight = renderedWidth / imgRatio;
      offsetY = (renderedHeight - displayedImgHeight) / 2;
    } else {
      displayedImgWidth = renderedHeight * imgRatio;
      offsetX = (renderedWidth - displayedImgWidth) / 2;
    }

    ctx.filter = `brightness(${brightness}%) contrast(${contrast + sharpness}%)`;

    if (!cropBox) {
      const is90Or270 = Math.abs(rotation) % 180 === 90;
      canvas.width = is90Or270 ? naturalHeight : naturalWidth;
      canvas.height = is90Or270 ? naturalWidth : naturalHeight;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(imgEl, -naturalWidth / 2, -naturalHeight / 2);
      
      return canvas.toDataURL('image/jpeg', 0.95);
    }

    const scaleX = naturalWidth / displayedImgWidth;
    const scaleY = naturalHeight / displayedImgHeight;

    const relativeX = cropBox.x - offsetX;
    const relativeY = cropBox.y - offsetY;

    const realX = Math.max(0, relativeX * scaleX);
    const realY = Math.max(0, relativeY * scaleY);
    const realWidth = Math.min(naturalWidth, cropBox.width * scaleX);
    const realHeight = Math.min(naturalHeight, cropBox.height * scaleY);

    canvas.width = realWidth;
    canvas.height = realHeight;

    ctx.save();
    if (rotation !== 0 || flipH || flipV) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      
      const origCenterX = naturalWidth / 2;
      const origCenterY = naturalHeight / 2;
      const drawX = -(origCenterX - realX + realWidth / 2);
      const drawY = -(origCenterY - realY + realHeight / 2);
      ctx.drawImage(imgEl, drawX, drawY);
    } else {
      ctx.drawImage(imgEl, realX, realY, realWidth, realHeight, 0, 0, realWidth, realHeight);
    }
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleInstantLocalCrop = () => {
    const imgEl = localImageRef.current;
    if (!imgEl) return;
    const resultUrl = generateCroppedImage(imgEl);
    if (resultUrl) {
      updateCurrentConfig({ isCropped: true, isCropActive: false, croppedLocalUrl: resultUrl });
    }
  };

  const handleDeactivateCrop = () => {
    updateCurrentConfig({ cropBox: null, isCropActive: false, isCropped: false, croppedLocalUrl: null });
  };

  const handleBackToEditCrop = () => {
    updateCurrentConfig({ isCropActive: true, isCropped: false });
  };

  const handleActivateCrop = () => {
    const imgEl = localImageRef.current;
    if (!imgEl) return;
    if (cropBox) {
      updateCurrentConfig({ isCropActive: true, isCropped: false });
      return;
    }
    const w = Math.min(320, imgEl.clientWidth - 20);
    const h = Math.min(240, imgEl.clientHeight - 20);
    updateCurrentConfig({
      isCropActive: true,
      isCropped: false,
      cropBox: { x: (imgEl.clientWidth - w) / 2, y: (imgEl.clientHeight - h) / 2, width: w, height: h }
    });
  };

  const handleNumberChange = (val: string, min: number, max: number, key: keyof PageConfig) => {
    let num = Number(val);
    if (num > max) num = max;
    if (num < min) num = min;
    updateCurrentConfig({ [key]: num });
  };

  const handleStyle = {
    width: "10px", height: "10px", background: "#ffffff",
    border: "2px solid #0052cc", borderRadius: "50%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  };

  const transformStyle = [
    `rotate(${rotation}deg)`,
    `rotateX(${perspectiveV}deg)`,
    `rotateY(${perspectiveH}deg)`,
    `scaleX(${flipH ? -1 : 1})`,
    `scaleY(${flipV ? -1 : 1})`
  ].join(" ");

  return (
    <div className="max-w-7xl mx-auto bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 md:p-6 space-y-6">
      
      {/* 🔝 MAIN TOP BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <h2 className="text-sm font-bold text-[#172b4d] flex items-center gap-2 tracking-wide uppercase">
          <Crop size={16} className="text-[#0052cc]" /> Image Configuration Panel
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">จัดระเบียบโครงสร้างระนาบ ความคมชัด และสัดส่วนขอบเขตของหน้าเอกสารก่อนการวิเคราะห์โครงสร้าง</p>
      </div>

      {/* 💻 MAIN WORK AREA GRID */}
      {/* ใช้ items-stretch เพื่อบีบให้ทั้งคอลัมน์ซ้ายและขวายาวดิ่งลงมาเท่ากันเป๊ะตามคอนเทนต์ฝั่งที่ยาวที่สุด */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        
        {/* 🎨 LEFT PREVIEW CANVAS + CAROUSEL */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          <div className="bg-[#edf2f7] border border-slate-200 rounded-xl flex flex-col items-center justify-center h-[540px] overflow-hidden shadow-inner relative p-4 [perspective:1000px]">
            
            {isCropped && croppedLocalUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
                <img 
                  src={croppedLocalUrl} 
                  alt="Cropped Output Preview" 
                  className="max-h-[460px] max-w-full block border border-slate-200 shadow-md rounded-lg bg-white object-contain"
                />
                <span className="text-[10px] bg-slate-800/90 text-slate-200 font-medium tracking-wider px-3 py-1 rounded-md absolute bottom-4 shadow">
                  PREVIEW RESULT: ภาพตัดขอบเขตสำเร็จ (แก้ไขได้ที่แผงควบคุมหลักด้านขวา)
                </span>
              </div>
            ) : (
              <div className="relative inline-block max-h-[440px] max-w-full" style={{ transformStyle: 'preserve-3d' }}>
                <img 
                  ref={localImageRef} 
                  src={currentRawUrl} 
                  alt="Raw Input Engine Preview" 
                  className="max-h-[440px] max-w-full block border border-slate-200 shadow-xl bg-white rounded-lg select-none object-contain transition-transform duration-150 ease-out" 
                  style={{ 
                    filter: `brightness(${brightness}%) contrast(${contrast + sharpness}%)`,
                    transform: transformStyle
                  }} 
                />
                
                {isCropActive && cropBox && (
                  <Rnd
                    size={{ width: cropBox.width, height: cropBox.height }}
                    position={{ x: cropBox.x, y: cropBox.y }}
                    onDragStop={(e, d) => updateCurrentConfig({ cropBox: { ...cropBox, x: d.x, y: d.y } })}
                    onResizeStop={(e, dir, ref, delta, pos) => updateCurrentConfig({ cropBox: { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos } })}
                    bounds="parent"
                    className="border-2 border-dashed border-blue-500 bg-blue-500/5 z-40"
                    resizeHandleStyles={{
                      topLeft: handleStyle, topRight: handleStyle, bottomLeft: handleStyle, bottomRight: handleStyle,
                      top: handleStyle, right: handleStyle, bottom: handleStyle, left: handleStyle
                    }}
                  >
                    <div className="w-full h-full relative">
                      <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow pointer-events-none uppercase">CROP ZONE</span>
                    </div>
                  </Rnd>
                )}
              </div>
            )}
          </div>

          {/* 🎞️ Carousel แผงควบคุมสลับหน้าเอกสาร */}
          <div className="bg-[#edf2f7] border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-slate-600 text-xs font-semibold px-2 shrink-0">
              คลังเอกสารประมวลผล: <span className="text-blue-600 font-mono font-bold ml-1">{currentIndex + 1} / {imagesList.length} หน้า</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-center w-full">
              <button type="button" disabled={currentIndex === 0} onClick={() => onIndexChange(currentIndex - 1)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-25"><ChevronLeft size={16} /></button>
              
              <div className="flex gap-2 overflow-x-auto max-w-xl py-1 no-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                {imagesList.map((url, idx) => (
                  <button 
                    key={idx} 
                    type="button" 
                    onClick={() => onIndexChange(idx)} 
                    className={`relative w-11 h-14 rounded border-2 overflow-hidden bg-white shrink-0 transition-all ${idx === currentIndex ? 'border-blue-500 ring-2 ring-blue-500/10 scale-105' : 'border-slate-200 opacity-50 hover:opacity-100'}`}
                  >
                    <img src={pagesConfig[idx]?.croppedLocalUrl || url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] text-slate-300 text-center font-mono py-0.5">#{idx + 1}</div>
                  </button>
                ))}
              </div>

              <button type="button" disabled={currentIndex === imagesList.length - 1} onClick={() => onIndexChange(currentIndex + 1)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
        
        {/* 🎛️ 📐 RIGHT SIDEBAR PANEL (เวอร์ชันปรับปรุงความยาวเท่าฝั่งซ้าย 100%) */}
        {/* ใช้ flex flex-col h-full เพื่อให้กล่องขวายาวลงมาชนระนาบแนวล่างสุดของหน้าจอพอดี และล็อกปุ่มคอนเฟิร์มไว้ท้ายสุด */}
        <div className="col-span-12 lg:col-span-4 border border-slate-200 rounded-xl bg-slate-50 shadow-2xs flex flex-col overflow-hidden h-full min-h-[616px]">
          
          {/* ส่วน Scrollable สำหรับเครื่องมือคอนโทรลภายในฟิลเตอร์ */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 pr-1.5 max-h-[530px]">
            
            {/* ✂️ 1. Crop Controls */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-2.5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-[#172b4d] uppercase tracking-wider flex items-center gap-1.5"><Crop size={13} className="text-blue-600" /> Crop Studio</h3>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isCropped ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-400'}`}>{isCropped ? "CROPPED" : "READY"}</span>
              </div>
              <div className="flex flex-col gap-2">
                {!isCropped ? (
                  isCropActive ? (
                    <>
                      <button type="button" onClick={handleInstantLocalCrop} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"><Scissors size={13} /> ดำเนินการครอบตัดหน้าปัจจุบัน</button>
                      <button type="button" onClick={handleDeactivateCrop} className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors">ยกเลิกกรอบ</button>
                    </>
                  ) : (
                    <button type="button" onClick={handleActivateCrop} className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-50 shadow-3xs transition-colors"><Crop size={13} /> เปิดใช้งานฟังก์ชันครอบตัด</button>
                  )
                ) : (
                  <button type="button" onClick={handleBackToEditCrop} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"><RefreshCw size={13} /> ปรับแก้ขอบเขตกรอบเดิม</button>
                )}
              </div>
            </div>

            {/* 🪞 2. Mirror Axis */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-2">
              <h3 className="text-xs font-bold text-[#172b4d] uppercase tracking-wider flex items-center gap-1.5"><FlipHorizontal size={13} className="text-slate-500" /> Mirror Transforms</h3>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={isCropped} onClick={() => updateCurrentConfig({ flipH: !flipH })} className={`py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${flipH ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}>
                  <FlipHorizontal size={13} /> กลับแนวนอน
                </button>
                <button type="button" disabled={isCropped} onClick={() => updateCurrentConfig({ flipV: !flipV })} className={`py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${flipV ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}>
                  <FlipVertical size={13} /> กลับแนวตั้ง
                </button>
              </div>
            </div>

            {/* 📐 3. Perspective Alignment */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-3.5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-[#172b4d] uppercase tracking-wider flex items-center gap-1.5"><Maximize2 size={13} className="text-slate-600" /> Perspective Alignment</h3>
                <button type="button" disabled={isCropped} onClick={() => updateCurrentConfig({ perspectiveV: 0, perspectiveH: 0 })} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 disabled:opacity-40"><RefreshCw size={10} className="inline mr-0.5" /> ล้างระนาบเอียง</button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">ปรับระนาบแนวตั้ง (Vertical Tilt)</span>
                  <div className="flex items-center text-slate-800 font-mono font-bold text-xs">
                    <input type="number" min="-20" max="20" disabled={isCropped} value={perspectiveV} onChange={(e) => handleNumberChange(e.target.value, -20, 20, "perspectiveV")} className="w-8 text-right bg-transparent focus:outline-none" />
                    <span className="text-slate-400 font-normal ml-0.5">°</span>
                  </div>
                </div>
                <input type="range" min="-20" max="20" disabled={isCropped} value={perspectiveV} onChange={(e) => updateCurrentConfig({ perspectiveV: Number(e.target.value) })} className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">ปรับระนาบแนวนอน (Horizontal Tilt)</span>
                  <div className="flex items-center text-slate-800 font-mono font-bold text-xs">
                    <input type="number" min="-20" max="20" disabled={isCropped} value={perspectiveH} onChange={(e) => handleNumberChange(e.target.value, -20, 20, "perspectiveH")} className="w-8 text-right bg-transparent focus:outline-none" />
                    <span className="text-slate-400 font-normal ml-0.5">°</span>
                  </div>
                </div>
                <input type="range" min="-20" max="20" disabled={isCropped} value={perspectiveH} onChange={(e) => updateCurrentConfig({ perspectiveH: Number(e.target.value) })} className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer" />
              </div>
            </div>

            {/* ☀️ 4. Core Enhancement Filters */}
            {[
              { label: "Image Rotation", value: rotation, min: -180, max: 180, unit: "°", icon: <RotateCw size={12} className="text-slate-500" />, key: "rotation" as keyof PageConfig, resetVal: 0, step: 90 },
              { label: "Brightness Level", value: brightness, min: 50, max: 150, unit: "%", icon: <Sparkles size={12} className="text-slate-500" />, key: "brightness" as keyof PageConfig, resetVal: 100, step: 5 },
              { label: "Contrast Level", value: contrast, min: 50, max: 150, unit: "%", icon: <Sparkles size={12} className="text-slate-500" />, key: "contrast" as keyof PageConfig, resetVal: 100, step: 5 },
              { label: "Text Sharpness Index", value: sharpness, min: 0, max: 100, unit: "%", icon: <Sparkles size={12} className="text-slate-500" />, key: "sharpness" as keyof PageConfig, resetVal: 0, step: 10 }
            ].map((item) => (
              <div key={item.key} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">{item.icon} {item.label}</label>
                  <div className="flex items-center text-slate-800 font-mono font-bold text-xs">
                    <input 
                      type="number" min={item.min} max={item.max} disabled={isCropped} value={Number(item.value)} 
                      onChange={(e) => handleNumberChange(e.target.value, item.min, item.max, item.key)}
                      className="w-10 text-right bg-transparent focus:outline-none"
                    />
                    <span className="text-slate-400 font-normal ml-0.5">{item.unit}</span>
                  </div>
                </div>
                
                <input type="range" min={item.min} max={item.max} disabled={isCropped} value={Number(item.value)} onChange={(e) => updateCurrentConfig({ [item.key]: Number(e.target.value) })} className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer disabled:opacity-40" />
                
                <div className="flex gap-1.5 items-center pt-1">
                  <button type="button" disabled={isCropped} onClick={() => updateCurrentConfig({ [item.key]: Math.max(item.min, Number(item.value) - item.step) })} className="text-[10px] font-bold bg-white border border-slate-200 px-2.5 py-0.5 rounded text-slate-600 hover:bg-slate-50"><Minus size={9} className="inline mr-0.5" />-{item.step}</button>
                  <button type="button" disabled={isCropped} onClick={() => updateCurrentConfig({ [item.key]: Math.min(item.max, Number(item.value) + item.step) })} className="text-[10px] font-bold bg-white border border-slate-200 px-2.5 py-0.5 rounded text-slate-600 hover:bg-slate-50"><Plus size={9} className="inline mr-0.5" />+{item.step}</button>
                  <button type="button" disabled={isCropped} onClick={() => updateCurrentConfig({ [item.key]: item.resetVal })} className="text-[10px] font-semibold text-slate-400 border border-transparent ml-auto hover:text-slate-600 transition-colors"><RefreshCw size={9} className="inline mr-0.5" /> รีเซ็ต</button>
                </div>
              </div>
            ))}
          </div>

          {/* 🎯 🔵 5. FIXED SIDEBAR BOTTOM ACTION */}
          {/* ปุ่มนี้จะปักหลักอยู่ท้ายตารางด้านขวาพอดี แนวระนาบเดียวกับของฝั่งซ้ายเป๊ะ สวยงามตามโมเดลต้นแบบครับ */}
          <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] mt-auto shrink-0">
            <button 
              type="button"
              onClick={() => onBatchConfirm(imagesList.map((url, idx) => pagesConfig[idx]?.croppedLocalUrl || url))} 
              className="w-full px-6 bg-[#0052cc] hover:bg-[#0043a4] text-white py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Check size={14} /> Confirm Layout & Edit ROI
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}