"use client";

import React, { useState } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import AdjustZone from './AdjustZone';
import WorkspaceZone from './WorkspaceZone';
import { ROI } from '../types/ocr';

export default function UploadZone() {
  // 🖼️ Original Raw Image (ภาพดิบที่เพิ่งอัปโหลด)
  const [rawImage, setRawImage] = useState<string | null>(null);
  
  // 🖼️ Processed Image (ภาพที่ผ่านการ Crop/Rotate แล้ว และจะใช้แสดงในหน้า Workspace)
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  // ⚙️ Image Pre-processing States (แชร์ค่าระหว่างหน้า Adjust)
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // 📏 Workspace States
  const [rois, setRois] = useState<ROI[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 🖱️ รับไฟล์ภาพ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setRawImage(dataUrl);
        setProcessedImage(null); // เคลียร์ภาพที่เคย Process ไว้เก่า
        setRois([]);
        setSelectedId(null);
        setIsConfirmed(false);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🔄🔥 ฟังก์ชันสำหรับเคลียร์พอร์ต เพื่อเปิดอัปโหลดไฟล์ใหม่กลางคัน
  const handleClearAndUploadNew = () => {
    setRawImage(null);
    setProcessedImage(null);
    setRois([]);
    setSelectedId(null);
    setIsConfirmed(false);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  };

  // 🗑️ ฟังก์ชันลบกล่อง (ส่งต่อให้ลูก)
  const deleteROI = (id: number) => {
    setRois(rois.filter(roi => roi.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // ✂️🔥 หัวใจหลัก: ฟังก์ชันรับภาพที่ "ตัดและหมุนเสร็จแล้ว" จากลูกมาแสดงผล
  const handleCompleteAdjustment = (finalImageDataUrl: string) => {
    setProcessedImage(finalImageDataUrl);
    setIsConfirmed(true); // สลับไปหน้า WorkspaceZone
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 font-sans select-none">
      
      {/* 💻 TOP MENU BAR */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
          <h1 className="text-sm font-bold tracking-wider text-slate-700 uppercase">Intelligent OCR Studio v12</h1>
        </div>
        
        {/* ดักเงื่อนไข: ถ้ามีรูปในระบบแล้ว จะแสดงสเตปปัจจุบันพร้อมปุ่มกดเปลี่ยนไฟล์ใหม่ */}
        {rawImage && (
          <div className="flex items-center gap-3">
            {/* 🟢 ปุ่มอัจฉริยะ: กดเปลี่ยนไฟล์ใหม่ได้ตลอดกระบวนการ */}
            <button
              type="button"
              onClick={handleClearAndUploadNew}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-95 animate-fade-in"
              title="Upload another document template"
            >
              <RefreshCw size={12} /> เปลี่ยนไฟล์ภาพใหม่
            </button>
            
            <div className="text-xs font-mono font-bold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md">
              {!isConfirmed ? "Step 1: ปรับแต่งและครอบตัด" : "Step 2: ลากกล่องคีย์ข้อมูล"}
            </div>
          </div>
        )}
      </div>

      {/* 🔮 ARCHITECTURE ROUTER CHANNEL (สลับหน้าอัจฉริยะ) */}
      {!rawImage ? (
        /* 🚪 สเตป 0: หน้าเปล่าเปิดรับไฟล์ */
        <div className="max-w-xl mx-auto mt-20 border-4 border-dashed border-slate-200 rounded-2xl p-16 text-center hover:border-blue-500 bg-white transition-all relative group shadow-lg">
          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
          <Upload className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <p className="mt-4 text-sm text-slate-600 font-medium">Import Document Template Image</p>
          <p className="text-[11px] text-slate-400 mt-1">รองรับเฉพาะไฟล์รูปภาพต้นฉบับเอกสารเทมเพลตเท่านั้น</p>
        </div>
      ) : !isConfirmed ? (
        /* 📐 สเตป 1: หน้าปรับแต่งความเอียงและครอปตัด (AdjustZone) */
        <AdjustZone 
          previewUrl={rawImage}
          rotation={rotation}
          setRotation={setRotation}
          brightness={brightness}
          setBrightness={setBrightness}
          contrast={contrast}
          setContrast={setContrast}
          onConfirm={handleCompleteAdjustment} 
        />
      ) : (
        /* ✍️ สเตป 2: หน้ากระดานวาดกล่อง OCR (WorkspaceZone) */
        <WorkspaceZone 
          previewUrl={processedImage!} 
          image={processedImage!}
          brightness={brightness}
          contrast={contrast}
          rotation={0} // รีเซ็ตเป็น 0 เพราะภาพถูกวาดหั่นบิดตรงมาอย่างถาวรแล้ว
          rois={rois}
          setRois={setRois}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          onBackToAdjust={() => setIsConfirmed(false)}
          deleteROI={deleteROI}
        />
      )}
    </div>
  );
}