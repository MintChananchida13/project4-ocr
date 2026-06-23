"use client";

import React, { useState, useRef } from 'react';
import { RotateCw, Crop, Check, RefreshCw, Minus, Plus, Scissors, ArrowLeft } from 'lucide-react';
import { Rnd } from 'react-rnd';

interface AdjustZoneProps {
  previewUrl: string;
  rotation: number;
  setRotation: React.Dispatch<React.SetStateAction<number>>;
  brightness: number;
  setBrightness: React.Dispatch<React.SetStateAction<number>>;
  contrast: number;
  setContrast: React.Dispatch<React.SetStateAction<number>>;
  onConfirm: (finalImageDataUrl: string) => void;
}

export default function AdjustZone({
  previewUrl,
  rotation,
  setRotation,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  onConfirm,
}: AdjustZoneProps) {
  
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropActive, setIsCropActive] = useState<boolean>(false);
  const [croppedLocalUrl, setCroppedLocalUrl] = useState<string | null>(null);
  const [isCropped, setIsCropped] = useState<boolean>(false);

  const localImageRef = useRef<HTMLImageElement | null>(null);

  // 📐 ฟังก์ชันแกนกลางคำนวณพิกัดหั่นภาพจริงอิงตามอัตราส่วน Scale หน้าจอ + ตัวกรอบ Rnd สีแดง
  const generateCroppedImage = (): string | null => {
    const imgEl = document.querySelector('img[alt="Pre-processing Preview"]') as HTMLImageElement;
    if (!imgEl) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 🎯 กรณีที่ 1: ผู้ใช้ไม่ได้คลิกใช้งาน Crop เลย (ให้ส่งภาพเต็มที่ปรับแต่งแสงและความชันแล้วข้ามไป)
    if (!cropBox) {
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(imgEl, -imgEl.naturalWidth / 2, -imgEl.naturalHeight / 2);
      
      return canvas.toDataURL('image/jpeg', 0.95);
    }

    // 🎯 กรณีที่ 2: ผู้ใช้ลากกรอบ Crop สีแดงระบุพื้นที่ไว้
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;

    const realX = cropBox.x * scaleX;
    const realY = cropBox.y * scaleY;
    const realWidth = cropBox.width * scaleX;
    const realHeight = cropBox.height * scaleY;

    canvas.width = realWidth;
    canvas.height = realHeight;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // ทำการดึงเนื้อหาตามสเกลที่ตั้งพิกัดตรงล็อกเป๊ะ
    ctx.drawImage(
      imgEl,
      realX, realY, realWidth, realHeight, 
      0, 0, realWidth, realHeight         
    );

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleConfirmAction = () => {
    const finalImage = isCropped && croppedLocalUrl ? croppedLocalUrl : generateCroppedImage();
    if (finalImage) {
      onConfirm(finalImage);
    }
  };

  const handleInstantLocalCrop = () => {
    const result = generateCroppedImage();
    if (result) {
      setCroppedLocalUrl(result);
      setIsCropped(true);
      setIsCropActive(false);
    }
  };

  const handleActivateCrop = () => {
    const imgEl = document.querySelector('img[alt="Pre-processing Preview"]') as HTMLImageElement;
    if (!imgEl) return;
    
    const w = 400;
    const h = 300;
    setCropBox({ 
      x: (imgEl.clientWidth - w) / 2, 
      y: (imgEl.clientHeight - h) / 2, 
      width: w, 
      height: h 
    });
    setIsCropActive(true);
    setIsCropped(false);
    setCroppedLocalUrl(null);
  };

  const handleDeactivateCrop = () => {
    setCropBox(null);
    setIsCropActive(false);
    setIsCropped(false);
    setCroppedLocalUrl(null);
  };

  const handleNumberChange = (val: string, min: number, max: number, setter: React.Dispatch<React.SetStateAction<number>>) => {
    let num = Number(val);
    if (num > max) num = max;
    if (num < min) num = min;
    setter(num);
  };

  const handleStyle = {
    width: "10px",
    height: "10px",
    background: "#ffffff",
    border: "2px solid #ef4444",
    borderRadius: "50%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
  };

  return (
    <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-4 md:p-6 space-y-6">
      
      {/* 📊 STEP PROCESS PROGRESS BAR (แสดงขั้นตอนสเตปการทำงานแบบโมเดิร์น) */}
      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 w-full max-w-3xl mx-auto justify-between relative">
          
          {/* สเตป 1: ปรับแต่งภาพถ่าย (Active) */}
          <div className="flex items-center gap-2.5 z-10 relative bg-slate-50 pr-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center ring-4 ring-blue-100">
              1
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">Pre-processing</p>
              <p className="text-[10px] text-slate-400 font-medium">ปรับมุมมองและครอปตัด</p>
            </div>
          </div>

          <div className="absolute top-3.5 left-0 right-0 h-[2px] bg-slate-200 -z-0 hidden md:block"></div>

          {/* สเตป 2: วาดกล่องข้อมูล */}
          <div className="flex items-center gap-2.5 z-10 relative bg-slate-50 px-4">
            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 text-slate-400 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-400">ROI Studio</p>
              <p className="text-[10px] text-slate-400 font-medium">ลากกล่องดักจับข้อความ</p>
            </div>
          </div>

          {/* สเตป 3: ตรวจสอบและบันทึก */}
          <div className="flex items-center gap-2.5 z-10 relative bg-slate-50 pl-4">
            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 text-slate-400 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-400">Ground Truth Editor</p>
              <p className="text-[10px] text-slate-400 font-medium">สกัดผลลัพธ์และเซฟข้อมูล</p>
            </div>
          </div>

        </div>
      </div>

      {/* 🔝 MAIN BAR */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Crop size={20} className="text-blue-600" /> Image Configuration Panel
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">ลากกรอบสีแดงคุมพื้นที่เนื้อหาเพื่อทำการครอบตัด และปรับมุมมองภาพถ่าย</p>
        </div>
        
        {/* กลุ่มปุ่ม Action คุมพอร์ต */}
        <div className="flex items-center gap-3">
          {/* 🎯 เพิ่มปุ่มย้อนกลับขั้นตอนกระบวนการ (Back to Adjust / Clear Preview) */}
          {isCropped && (
            <button
              type="button"
              onClick={() => { setIsCropped(false); setIsCropActive(true); }}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft size={16} /> ย้อนกลับ/แก้ไขขอบ
            </button>
          )}
          <button 
            type="button"
            onClick={handleConfirmAction} 
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 shadow-green-600/20"
          >
            <Check size={18} /> Confirm & Start Drawing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        
        {/* 🎨 LEFT PREVIEW CANVAS */}
        <div className="col-span-9 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center h-[580px] overflow-hidden shadow-inner relative p-4">
          {isCropped && croppedLocalUrl ? (
            <div className="flex flex-col items-center justify-center gap-2 animate-fade-in w-full h-full">
              <img 
                src={croppedLocalUrl} 
                alt="Cropped Preview Result" 
                className="max-h-[520px] max-w-full block border border-green-400 shadow-2xl rounded-lg bg-white object-contain"
              />
              <span className="text-[11px] bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full absolute bottom-4 left-1/2 -translate-x-1/2">
                ✨ พรีวิวแสดงผลลัพธ์ภาพที่ครอบตัดเรียบร้อย
              </span>
            </div>
          ) : (
            <div className="relative inline-block" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}>
              <img 
                ref={localImageRef} 
                src={previewUrl} 
                alt="Pre-processing Preview" 
                className="max-h-[500px] max-w-full block border shadow-2xl bg-white rounded-lg select-none pointer-events-none object-contain" 
                style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }} 
              />
              
              {isCropActive && cropBox && (
                <Rnd
                  size={{ width: cropBox.width, height: cropBox.height }}
                  position={{ x: cropBox.x, y: cropBox.y }}
                  onDragStop={(e, d) => setCropBox(p => p ? { ...p, x: d.x, y: d.y } : null)}
                  onResizeStop={(e, dir, ref, delta, pos) => setCropBox({ width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos })}
                  bounds="parent"
                  className="border-2 border-dashed border-red-500 bg-red-500/10 z-40"
                  resizeHandleStyles={{
                    topLeft: handleStyle, topRight: handleStyle, bottomLeft: handleStyle, bottomRight: handleStyle,
                    top: handleStyle, right: handleStyle, bottom: handleStyle, left: handleStyle
                  }}
                >
                  <div className="w-full h-full relative">
                    <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">CROP AREA</span>
                  </div>
                </Rnd>
              )}
            </div>
          )}
        </div>

        {/* 🎛️ RIGHT PROPERTIES CONTROLS PANEL */}
        <div className="col-span-3 space-y-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 h-fit">
          
          {/* ✂️ 1. Crop Selector & Instant Action Buttons */}
          <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5"><Crop size={14} className="text-red-500" /> Crop Studio</h3>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isCropped ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {isCropped ? "CROPPED" : isCropActive ? "ON" : "OFF"}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400">เปิดใช้งานกรอบเพื่อระบุและครอบเนื้อหากระดาษเอกสาร</p>
            
            <div className="flex flex-col gap-2 pt-1">
              {!isCropped ? (
                isCropActive ? (
                  <>
                    <button type="button" onClick={handleInstantLocalCrop} className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 transition-all active:scale-95"><Scissors size={14} /> กดตัดรูปภาพเดี๋ยวนี้</button>
                    <button type="button" onClick={handleDeactivateCrop} className="w-full py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">ปิดใช้งานเส้นกรอบ</button>
                  </>
                ) : (
                  <button type="button" onClick={handleActivateCrop} className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-50 transition-colors"><Crop size={14} /> เปิดใช้งานครอบตัด</button>
                )
              ) : (
                <button type="button" onClick={() => { setIsCropped(false); setIsCropActive(true); }} className="w-full py-2 bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:bg-slate-800 transition-colors"><RefreshCw size={14} /> แก้ไขขอบตัดใหม่</button>
              )}
            </div>
          </div>

          {/* 📐 2. Free Rotation */}
          <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <RotateCw size={14} className="text-blue-500" /> Free Rotation
              </label>
              <div className="flex items-center gap-0.5 text-blue-600">
                <input 
                  type="number" 
                  min="-180" 
                  max="180" 
                  disabled={isCropped}
                  value={rotation} 
                  onChange={(e) => handleNumberChange(e.target.value, -180, 180, setRotation)} 
                  className="w-12 text-center bg-transparent focus:outline-none text-sm font-bold disabled:opacity-50"
                />
                <span className="text-xs text-slate-400 font-bold">°</span>
              </div>
            </div>
            <input type="range" min="-180" max="180" disabled={isCropped} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer disabled:opacity-50" />
            <div className="flex gap-1.5 pt-0.5 items-center">
              <button type="button" disabled={isCropped} onClick={() => setRotation(p => Math.max(-180, p - 90))} className="text-[11px] font-medium bg-white border border-slate-200 px-3 py-1 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50">-90°</button>
              <button type="button" disabled={isCropped} onClick={() => setRotation(p => Math.min(180, p + 90))} className="text-[11px] font-medium bg-white border border-slate-200 px-3 py-1 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50">+90°</button>
              <button type="button" disabled={isCropped} onClick={() => setRotation(0)} className="text-[11px] font-medium bg-white border border-slate-200 px-3 py-1 rounded-md hover:bg-slate-50 text-slate-400 ml-auto flex items-center gap-1 shadow-sm disabled:opacity-50"><RefreshCw size={10} /> Reset</button>
            </div>
          </div>

          {/* ☀️ 3. Brightness */}
          <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 uppercase">☀️ Brightness</label>
              <div className="flex items-center gap-0.5 text-blue-600">
                <input 
                  type="number" 
                  min="50" 
                  max="150" 
                  disabled={isCropped}
                  value={brightness} 
                  onChange={(e) => handleNumberChange(e.target.value, 50, 150, setBrightness)} 
                  className="w-12 text-center bg-transparent focus:outline-none text-sm font-bold disabled:opacity-50"
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
            <input type="range" min="50" max="150" disabled={isCropped} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer disabled:opacity-50" />
            <div className="flex gap-1.5 pt-0.5 items-center">
              <button type="button" disabled={isCropped} onClick={() => setBrightness(p => Math.max(50, p - 5))} className="text-[11px] font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50"><Minus size={11} className="inline mr-0.5" />-5</button>
              <button type="button" disabled={isCropped} onClick={() => setBrightness(p => Math.min(150, p + 5))} className="text-[11px] font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50"><Plus size={11} className="inline mr-0.5" />+5</button>
              <button type="button" disabled={isCropped} onClick={() => setBrightness(100)} className="text-[11px] font-medium bg-white border border-slate-200 px-3 py-1 rounded-md hover:bg-slate-100 text-slate-400 ml-auto flex items-center gap-1 shadow-sm disabled:opacity-50"><RefreshCw size={10} /> Reset</button>
            </div>
          </div>

          {/* 🌗 4. Contrast */}
          <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 uppercase">🌗 Contrast</label>
              <div className="flex items-center gap-0.5 text-blue-600">
                <input 
                  type="number" 
                  min="50" 
                  max="150" 
                  disabled={isCropped}
                  value={contrast} 
                  onChange={(e) => handleNumberChange(e.target.value, 50, 150, setContrast)} 
                  className="w-12 text-center bg-transparent focus:outline-none text-sm font-bold disabled:opacity-50"
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
            <input type="range" min="50" max="150" disabled={isCropped} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-blue-600 h-1 bg-slate-200 rounded cursor-pointer disabled:opacity-50" />
            <div className="flex gap-1.5 pt-0.5 items-center">
              <button type="button" disabled={isCropped} onClick={() => setContrast(p => Math.max(50, p - 5))} className="text-[11px] font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50"><Minus size={11} className="inline mr-0.5" />-5</button>
              <button type="button" disabled={isCropped} onClick={() => setContrast(p => Math.min(150, p + 5))} className="text-[11px] font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50"><Plus size={11} className="inline mr-0.5" />+5</button>
              <button type="button" disabled={isCropped} onClick={() => setContrast(100)} className="text-[11px] font-medium bg-white border border-slate-200 px-3 py-1 rounded-md hover:bg-slate-100 text-slate-400 ml-auto flex items-center gap-1 shadow-sm disabled:opacity-50"><RefreshCw size={10} /> Reset</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}