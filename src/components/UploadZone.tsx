"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Upload, RotateCw, Sun, Contrast, Square, Trash2, Edit3, CheckCircle } from 'lucide-react';

interface ROI {
  id: number;
  fieldName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OCRResult {
  id: number;
  fieldName: string;
  bbox: number[];
  extractedText: string;
  confidence: number;
}

export default function UploadZone() {
  // States สำหรับการจัดการรูปภาพ
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);

  // States สำหรับระบบวาด ROI (Bounding Box)
  const [rois, setRois] = useState<ROI[]>([]);
  const [currentFieldName, setCurrentFieldName] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // States สำหรับผลลัพธ์ OCR และ Ground Truth Editor
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [templateInfo, setTemplateInfo] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 1. ฟังก์ชันรองรับการอัปโหลดไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('กรุณาอัปโหลดไฟล์รูปภาพ หรือ PDF เท่านั้นครับ');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setRois([]); 
        setOcrResults([]); 
        setTemplateInfo(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. วาดภาพและกล่อง ROI ทั้งหมดลงบน Canvas
  useEffect(() => {
    if (!image || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาดกล่อง ROI ที่ผู้ใช้วาดเสร็จแล้ว (สีน้ำเงิน)
    rois.forEach((roi) => {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
      
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(roi.fieldName, roi.x + 4, roi.y + 16);
    });

    // วาดกล่องพิกัดที่กำลังลากเมาส์อยู่ ณ ปัจจุบัน (สีแดงเส้นประ)
    if (isDrawing && currentRect) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
      ctx.setLineDash([]); 
    }
  }, [image, rois, isDrawing, currentRect]);

  // 3. การจัดการ Events ลากเมาส์เพื่อดึงค่าพิกัด Bounding Box
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentFieldName) {
      alert("กรุณาระบุชื่อฟิลด์ (Field Name) ก่อนลากวาดกล่องพิกัดครับ");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(startPos.x - x),
      h: Math.abs(startPos.y - y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;
    setIsDrawing(false);

    const newROI: ROI = {
      id: Date.now(),
      fieldName: currentFieldName,
      x: currentRect.x,
      y: currentRect.y,
      width: currentRect.w,
      height: currentRect.h
    };

    setRois([...rois, newROI]);
    setCurrentRect(null);
    setCurrentFieldName(""); 
  };

  const deleteROI = (id: number) => {
    setRois(rois.filter(roi => roi.id !== id));
  };

  // 4. บายพาส SQLite ยิงพิกัดและภาพ Base64 ตรงไปหาพอร์ต 8000 ของ Python FastAPI ของเรา
const handleRunOCR = async () => {
    setIsLoading(true);
    try {
      console.log("🚀 ส่งข้อมูลภาพบิตแมปและอาเรย์พิกัด ไปหา Python AI Engine...");
      
      // ดึงขนาดจริงของรูปภาพต้นฉบับเพื่อมาหาอัตราส่วน (Ratio)
      const imageElement = imageRef.current;
      if (!imageElement) return;

      const naturalWidth = imageElement.naturalWidth;   // ความกว้างจริงของไฟล์ภาพ
      const naturalHeight = imageElement.naturalHeight; // ความสูงจริงของไฟล์ภาพ
      const displayWidth = imageElement.clientWidth;    // ความกว้างที่แสดงบนจอ
      const displayHeight = imageElement.clientHeight;  // ความสูงที่แสดงบนจอ

      // หาค่า Scale Factor
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      const response = await fetch('http://localhost:8000/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image, 
          // คูณพิกัดหน้าจอด้วย Scale เพื่อแปลงเป็นพิกัดบนรูปภาพจริงก่อนส่งให้ Python
          rois: rois.map(roi => ({
            fieldName: roi.fieldName,
            x: roi.x * scaleX,
            y: roi.y * scaleY,
            width: roi.width * scaleX,
            height: roi.height * scaleY
          }))
        }),
      });

      const aiData = await response.json();

      if (aiData.success) {
        alert(`ฝั่ง Python AI ประมวลผลและหั่นภาพสำเร็จ!\nแม่แบบที่ตรวจจับ: ${aiData.matched_template}`);
        
        // รับค่าผลลัพธ์การจัดทำโมเดลตัวอักษรที่ Python แกะได้มาโยงเข้า Table
        const mappedResults = aiData.extracted_data.map((item: any, index: number) => ({
          id: index,
          fieldName: item.fieldName,
          bbox: [], 
          extractedText: item.text, 
          confidence: item.confidence
        }));
        
        setOcrResults(mappedResults);
        setTemplateInfo(aiData.matched_template);
      } else {
        alert("เซิร์ฟเวอร์ AI ของ Python เกิดข้อผิดพลาดภายในโครงสร้าง");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ยิงข้อมูลตรงหา Python API พอร์ต 8000 ได้ (อย่าลืมเปิด uvicorn นะครับ)");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. สำหรับส่วน Ground Truth Editor ให้ User แก้ไขคำผิดได้หน้าบ้าน
  const handleTextChange = (id: number, newValue: string) => {
    setOcrResults(prev =>
      prev.map(item => item.id === id ? { ...item, extractedText: newValue } : item)
    );
  };

  const handleSaveGroundTruth = () => {
    console.log("บันทึกข้อมูล Ground Truth สำเร็จ:", ocrResults);
    alert("บันทึกข้อมูลและส่งออก Plaintext / JSON เรียบร้อย! (เช็กที่ Console log)");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white rounded-xl shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">OCR Processing Workspace</h2>
      
      {!image ? (
        /* โซน Dropzone แรกสุด */
        <div className="border-4 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
          <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF รองรับสูงสุด 10MB</p>
        </div>
      ) : (
        /* สภาพแวดล้อมหลักในการจัดการเอกสาร */
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ซ้าย/กลาง: หน้าต่างจัดการและวาดรูป */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center bg-gray-900 border rounded-xl p-4 relative overflow-hidden select-none min-h-[500px]">
              <img 
                ref={imageRef}
                src={image} 
                alt="Origin Pipeline Source" 
                className="max-h-[500px] object-contain opacity-70 transition-all pointer-events-none"
                style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)`, transform: `rotate(${rotation}deg)` }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />
            </div>
            
            {/* ขวา: แผง Config & Setup Metadata */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-1.5 text-sm"><Square size={16} className="text-blue-600" /> 1. Define ROI Key Field</h3>
                <input 
                  type="text" 
                  placeholder="เช่น Invoice_No, Grand_Total" 
                  value={currentFieldName}
                  onChange={(e) => setCurrentFieldName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 leading-relaxed">* พิมพ์ชื่อฟิลด์กำกับไว้ก่อน จากนั้นใช้เมาส์คลิกลากครอบข้อมูลบนเอกสาร</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
                <h3 className="font-semibold text-gray-700 text-sm">Image Adjustment</h3>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 flex items-center gap-1"><Sun size={14} /> Brightness ({brightness}%)</label>
                  <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
                  
                  <label className="text-xs text-gray-500 flex items-center gap-1"><Contrast size={14} /> Contrast ({contrast}%)</label>
                  <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
                </div>
                <button onClick={() => setRotation((prev) => (prev + 90) % 360)} className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
                  <RotateCw size={14} /> Rotate Image 90°
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border space-y-2 max-h-[200px] overflow-y-auto">
                <h3 className="font-semibold text-gray-700 text-sm">Selected Key Map ({rois.length})</h3>
                {rois.length === 0 ? (
                  <p className="text-xs text-gray-400">ยังไม่มีการกำหนด Region of Interest</p>
                ) : (
                  rois.map((roi) => (
                    <div key={roi.id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-xs shadow-sm">
                      <div>
                        <span className="font-bold text-blue-600">{roi.fieldName}</span>
                        <span className="text-gray-400 ml-1.5">[{Math.round(roi.x)}, {Math.round(roi.y)}]</span>
                      </div>
                      <button onClick={() => deleteROI(roi.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button 
                disabled={rois.length === 0 || isLoading}
                onClick={handleRunOCR}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? "กำลังประมวลผลระบบ AI..." : "Run OCR Engine & Router"}
              </button>
            </div>
          </div>

          /* บล็อกล่างสุด: Ground Truth Editor */
          {ocrResults.length > 0 && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Edit3 size={20} className="text-blue-600" /> Ground Truth Editor
                  </h3>
                  {templateInfo && <p className="text-xs text-green-600 font-medium mt-0.5">Matched Template Matrix: {templateInfo}</p>}
                </div>
                <button 
                  onClick={handleSaveGroundTruth}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shadow"
                >
                  <CheckCircle size={16} /> Approve & Export Clean JSON
                </button>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Field Name</th>
                      <th className="px-6 py-3">Confidence Score</th>
                      <th className="px-6 py-3">Extracted Text (แก้ไขตรงนี้ได้)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-600">
                    {ocrResults.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-blue-600">{result.fieldName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${result.confidence >= 0.9 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {(result.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={result.extractedText}
                            onChange={(e) => handleTextChange(result.id, e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}