"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AdjustZone from "../src/components/AdjustZone";
import WorkspaceZone from "../src/components/WorkspaceZone";
import GroundTruthEditorZone from "../src/components/GroundTruthEditorZone";
import { ROI, OCRResult } from "../src/types/ocr";

// 📝 ปรับนิยาม Interface สำหรับข้อมูลสเตตการปรับแต่งรายหน้าให้รองรับผลลัพธ์การหั่นพรีวิวเรียลไทม์
interface PageConfig {
  rotation: number;
  brightness: number;
  contrast: number;
  sharpness: number;      // ✨ เพิ่มใหม่
  perspectiveV: number;   // ✨ ปรับดึงบน-ล่าง (-20 ถึง 20)
  perspectiveH: number;   // ✨ ปรับดึงซ้าย-ขวา (-20 ถึง 20)
  flipH: boolean;         // ✨ กลับกระจกแนวนอน
  flipV: boolean;         // ✨ กลับกระจกแนวตั้ง
  cropBox: { x: number; y: number; width: number; height: number } | null;
  isCropActive: boolean;
  isCropped: boolean;
  croppedLocalUrl: string | null;
}

// 🟢 โหลด UploadZone แบบ Dynamic ป้องกันปัญหาฝั่ง Server-Side
const UploadZone = dynamic(() => import("../src/components/UploadZone"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 text-center text-slate-500 font-medium text-xs">
      กำลังเตรียมส่วนประกอบการอัปโหลด...
    </div>
  ),
});

export default function Home() {
  // 🧭 State ควบคุมการสลับหน้าหลักของทั้งโปรเจกต์
  const [currentStep, setCurrentStep] = useState<"upload" | "adjust" | "studio" | "editor">("upload");

  // 🖼️ คลังเก็บรูปภาพระบบอาร์เรย์ (ข้อมูลภาพต้นฉบับดั้งเดิม)
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // ✨ State คอนฟิกการแต่งภาพแยกรายหน้า (เพิ่มฟิลด์ลงใน Type เพื่อให้เก็บประวัติการหั่นพรีวิวได้ครบทุกหน้า)
  const [pagesConfig, setPagesConfig] = useState<PageConfig[]>([]);

  // 🖼️ State ประคองโครงสร้างระบบดั้งเดิม
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [image, setImage] = useState<string | null>(null);

  // 📦 State เก็บพิกัดกล่องและผลลัพธ์ AI OCR
  const [rois, setRois] = useState<ROI[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 🖱️ ฟังก์ชันเมื่ออัปโหลดคลังไฟล์สำเร็จ
  const handleUploadSuccess = (urls: string[]) => {
    setImagesList(urls);
    setCurrentIndex(0);
    setPreviewUrl(urls[0]);
    setImage(urls[0]);
    
    // ✨ อัปเดตโครงสร้างค่าเริ่มต้นของแต่ละหน้าให้สอดคล้องกับ AdjustZone ตัวใหม่
    const initialConfigs = urls.map(() => ({
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
    }));
    setPagesConfig(initialConfigs);
    
    setCurrentStep("adjust");
  };

  // 🔄 ฟังก์ชันล้างพอร์ตระบบเพื่อเริ่มต้นใหม่ทั้งหมด
  const handleClearAndUploadNew = () => {
    setImagesList([]);
    setCurrentIndex(0);
    setPagesConfig([]);
    setPreviewUrl("");
    setImage(null);
    setRois([]);
    setSelectedId(null);
    setOcrResults([]);
    setCurrentStep("upload");
  };

  // 🟢 3. ฟังก์ชันปลายทางเมื่อกดคอนเฟิร์มใหญ่ใน Step Adjust หน้าจะเปลี่ยนเข้าสู่กระดานลากกล่อง
  const handleBatchConfirm = (finalProcessedImages: string[]) => {
    // เซฟอาร์เรย์รูปภาพที่ผ่านการประมวลผลแต่ง/ตัดเสร็จสิ้นทับลงคลังหลักเพื่อนำไปรัน OCR ต่อ
    setImagesList(finalProcessedImages);
    setPreviewUrl(finalProcessedImages[currentIndex] || "");
    setImage(finalProcessedImages[currentIndex] || null);
    
    // ย้าย Step ทะลุมิติไปยัง ROI Studio
    setCurrentStep("studio");
  };

  // 🤖 ฟังก์ชันสั่งรัน AI OCR อิงตามสเกลภาพหน้าปัจจุบัน
  const handleRunOCR = async (scaleX: number, scaleY: number) => {
    if (rois.length === 0) return;
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagesList[currentIndex] || image,
          rois: rois.map((roi) => ({
            fieldName: roi.fieldName,
            x: roi.x * scaleX,
            y: roi.y * scaleY,
            width: roi.width * scaleX,
            height: roi.height * scaleY,
          })),
        }),
      });
      const aiData = await response.json();
      if (aiData.success) {
        setOcrResults(
          aiData.extracted_data.map((resItem: any, idx: number) => ({
            id: idx,
            fieldName: resItem.fieldName,
            bbox: [],
            extractedText: resItem.text,
            confidence: resItem.confidence,
            saved_path: resItem.saved_path || "",
          }))
        );
        setCurrentStep("editor");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเอนจิน AI");
    } finally {
      setIsLoading(false);
    }
  };

  // 💾 ฟังก์ชันส่งอนุมัติและบันทึกข้อมูลเข้าฐานข้อมูล
  const handleApproveAndSave = async () => {
    const payload = {
      templateName: `Thai_Legal_Document_Page_${currentIndex + 1}`,
      extracted_data: ocrResults.map((item) => ({
        fieldName: item.fieldName || "",
        text: item.extractedText || "",
        confidence: item.confidence !== undefined ? item.confidence : 0.9,
        saved_path: item.saved_path || "",
      })),
    };
    try {
      await fetch("http://localhost:8000/api/templates/approve-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert(`🎉 บันทึกข้อมูลของเอกสารหน้า ${currentIndex + 1} เรียบร้อยแล้ว!`);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8 select-none">
      <div className="container mx-auto px-6 max-w-7xl space-y-5">
        
        {/* 👑 หัวข้อระบบหลัก */}
        <div className="text-center py-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Intelligent OCR Portal
          </h1>
        </div>

        {/* 💻 แถบเมนู Status Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm shadow-indigo-600/30 animate-pulse"></div>
            <span className="text-xs font-bold tracking-wide text-slate-700 uppercase">
              Intelligent OCR Studio v1.2 
              {imagesList.length > 0 && ` (Active: หน้า ${currentIndex + 1}/${imagesList.length})`}
            </span>
          </div>
          
          <div className="flex items-center">
            {imagesList.length > 0 && (
              <button
                type="button"
                onClick={handleClearAndUploadNew}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-98"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                เปลี่ยนไฟล์ภาพใหม่
              </button>
            )}
          </div>
        </div>

        {/* 🔀 ลอจิกการเรนเดอร์สลับหน้าแบบ Step-by-Step */}
        
        {currentStep === "upload" && (
          <UploadZone onUploadSuccess={handleUploadSuccess} /> 
        )}

        {currentStep === "adjust" && (
          <AdjustZone
            imagesList={imagesList}
            currentIndex={currentIndex}
            onIndexChange={(nextIdx) => setCurrentIndex(nextIdx)}
            pagesConfig={pagesConfig}
            setPagesConfig={setPagesConfig}
            onBatchConfirm={handleBatchConfirm}
          />
        )}

        {currentStep === "studio" && (
          <WorkspaceZone
            previewUrl={imagesList[currentIndex] || ""}
            image={imagesList[currentIndex] || null}
            // 🛡️ ดัก Fallback ปลอดภัย เผื่อข้อมูลใน config หน้าปัจจุบันเป็น undefined
            brightness={pagesConfig[currentIndex]?.brightness ?? 100}
            contrast={pagesConfig[currentIndex]?.contrast ?? 100}
            rotation={pagesConfig[currentIndex]?.rotation ?? 0}
            rois={rois}
            setRois={setRois}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onBackToAdjust={() => setCurrentStep("adjust")}
            deleteROI={(id) => setRois((p) => p.filter((roi) => roi.id !== id))}
            isLoading={isLoading}
            onRunOCR={handleRunOCR}
            currentIndex={currentIndex}
            imagesList={imagesList}
            onIndexChange={(nextIdx) => setCurrentIndex(nextIdx)}
          />
        )}

        {currentStep === "editor" && (
          <GroundTruthEditorZone
            previewUrl={imagesList[currentIndex] || ""}
            rois={rois}
            ocrResults={ocrResults}
            setOcrResults={setOcrResults}
            onBackToStudio={() => setCurrentStep("studio")} 
            onApproveAndSave={handleApproveAndSave}
            imageList={imagesList}
            currentImageIndex={currentIndex}
            onImageIndexChange={(nextIdx) => setCurrentIndex(nextIdx)}
          />
        )}
      </div>
    </main>
  );
}