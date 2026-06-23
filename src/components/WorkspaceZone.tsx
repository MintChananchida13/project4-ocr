"use client";

import React, { useState, useRef } from 'react';
import { Square, Trash2, Edit3, Move, Hand, X, ArrowLeft } from 'lucide-react';
import { Rnd } from "react-rnd";
import { ROI, OCRResult } from '../types/ocr';

interface WorkspaceZoneProps {
  previewUrl: string;
  image: string | null;
  brightness: number;
  contrast: number;
  rotation: number;
  rois: ROI[];
  setRois: React.Dispatch<React.SetStateAction<ROI[]>>;
  selectedId: number | null;
  setSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  onBackToAdjust: () => void;
  deleteROI: (id: number) => void;
}

export default function WorkspaceZone({
  previewUrl,
  image,
  brightness,
  contrast,
  rotation,
  rois,
  setRois,
  selectedId,
  setSelectedId,
  onBackToAdjust,
  deleteROI,
}: WorkspaceZoneProps) {
  const [activeTool, setActiveTool] = useState<'pan' | 'box'>('box');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [dragBox, setDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ scrollLeft: 0, scrollTop: 0, clientX: 0, clientY: 0 });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [templateInfo, setTemplateInfo] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const getScale = () => {
    if (!imageRef.current) return { x: 1, y: 1 };
    return {
      x: imageRef.current.naturalWidth / imageRef.current.clientWidth,
      y: imageRef.current.naturalHeight / imageRef.current.clientHeight,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !viewportRef.current) return;

    if (activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
        clientX: e.clientX,
        clientY: e.clientY
      });
      return;
    }

    const isTargetBox = (e.target as HTMLElement).closest('.rnd-box-item');
    if (!isTargetBox) {
      e.preventDefault(); 
      e.stopPropagation();
      setSelectedId(null); 
      setActiveTool('box');
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      setStartPos({ x, y });
      setDragBox({ x, y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && viewportRef.current) {
      const dx = e.clientX - panStart.clientX;
      const dy = e.clientY - panStart.clientY;
      viewportRef.current.scrollLeft = panStart.scrollLeft - dx;
      viewportRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    if (!isDrawing || !dragBox || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setDragBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      w: Math.abs(startPos.x - currentX),
      h: Math.abs(startPos.y - currentY)
    });
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !dragBox) return;
    setIsDrawing(false);

    if (dragBox.w > 5 && dragBox.h > 5) {
      const newBox: ROI = {
        id: Date.now(),
        fieldName: `field_${rois.length + 1}`,
        x: dragBox.x,
        y: dragBox.y,
        width: dragBox.w,
        height: dragBox.h
      };
      setRois([...rois, newBox]);
      setSelectedId(newBox.id);
    } else {
      setSelectedId(null);
    }
    setDragBox(null);
    setActiveTool('box');
  };

  const updateROI = (id: number, data: Partial<ROI>) => {
    setRois(prev => prev.map(roi => roi.id === id ? { ...roi, ...data } : roi));
  };

  const handleRunOCR = async () => {
    if (rois.length === 0) return;
    setIsLoading(true);
    try {
      const { x: scaleX, y: scaleY } = getScale();
      const response = await fetch('http://localhost:8000/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
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
        setOcrResults(aiData.extracted_data.map((item: any, index: number) => ({
          id: index,
          fieldName: item.fieldName,
          bbox: [],
          extractedText: item.text,
          confidence: item.confidence,
          saved_path: item.saved_path || ""
        })));
        setTemplateInfo(aiData.matched_template);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเอนจิน AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAndSave = async () => {
    const dataSource = ocrResults.length > 0 ? ocrResults : rois;
    const payload = {
      templateName: "Thai_Legal_Document_v1",
      imageWidth: imageRef.current ? imageRef.current.naturalWidth : 1920,
      imageHeight: imageRef.current ? imageRef.current.naturalHeight : 1080,
      extracted_data: dataSource.map((item: any) => ({
        fieldName: item.fieldName || "",
        text: item.extractedText || item.text || "",
        extracted_text: item.extractedText || item.text || "",
        confidence: item.confidence !== undefined ? item.confidence : 0.90,
        saved_path: item.saved_path || ""
      }))
    };
    try {
      await fetch("http://localhost:8000/api/templates/approve-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      alert("🎉 บันทึกข้อมูลสำเร็จ!");
    } catch (error) {
      alert("เซฟล้มเหลว");
    }
  };

  const handleStyle = {
    width: "8px",
    height: "8px",
    background: "#ffffff",
    border: "1.5px solid #2563eb",
    borderRadius: "2px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* 📊 STEP PROCESS PROGRESS BAR */}
      <div className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 w-full max-w-3xl mx-auto justify-between relative">
          
          {/* สเตป 1 */}
          <div className="flex items-center gap-2.5 z-10 relative bg-white pr-4">
            <div className="w-7 h-7 rounded-full bg-green-100 border border-green-300 text-green-600 font-bold text-xs flex items-center justify-center">
              ✓
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-500">Pre-processing</p>
              <p className="text-[10px] text-slate-400 font-medium">ปรับมุมมองและครอปตัด</p>
            </div>
          </div>

          <div className="absolute top-3.5 left-0 right-0 h-[2px] bg-slate-200 -z-0 hidden md:block"></div>

          {/* สเตป 2 */}
          <div className="flex items-center gap-2.5 z-10 relative bg-white px-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center ring-4 ring-blue-100">
              2
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">ROI Studio</p>
              <p className="text-[10px] text-slate-400 font-medium">ลากกล่องดักจับข้อความ</p>
            </div>
          </div>

          {/* สเตป 3 */}
          <div className="flex items-center gap-2.5 z-10 relative bg-white pl-4">
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

      {/* 💻 MAIN CANVASES ROW */}
      <div className="grid grid-cols-12 gap-5 h-[620px]">
        
        {/* 🛠️ LEFT SIDEBAR: VERTICAL TOOLBAR */}
        <div className="col-span-1 flex flex-col items-center gap-3 bg-white border border-slate-200 py-4 rounded-xl shadow-sm w-16 h-full">
          <button 
            type="button"
            onClick={() => { setActiveTool('pan'); setSelectedId(null); }}
            className={`p-2.5 rounded-lg transition-all ${activeTool === 'pan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Hand Pan Tool (H) - จับลากเลื่อนแคนวาส"
          >
            <Hand size={20} />
          </button>
          <button 
            type="button"
            onClick={() => setActiveTool('box')}
            className={`p-2.5 rounded-lg transition-all ${activeTool === 'box' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Box Drag Tool (M) - วาดกรอบต่อเนื่องอัจฉริยะ"
          >
            <Square size={20} />
          </button>
          <div className="w-8 h-[1px] bg-slate-200 my-2"></div>
          <button 
            type="button"
            onClick={() => { setRois([]); setSelectedId(null); }}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear Canvas"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* 🎨 CENTER: VIEWPORT MAIN CANVAS */}
        <div ref={viewportRef} className="col-span-8 bg-slate-200 border border-slate-300 rounded-xl overflow-auto flex items-center justify-center p-6 shadow-inner h-full">
          <div 
            ref={containerRef}
            className={`relative inline-block ${selectedId ? 'cursor-default' : activeTool === 'box' ? 'cursor-crosshair select-none' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ transform: `rotate(${rotation}deg)` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img 
              ref={imageRef}
              src={previewUrl} 
              alt="Workspace" 
              draggable="false" 
              className="max-h-[540px] w-auto block border border-slate-300 shadow-xl rounded bg-white select-none pointer-events-none"
              style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
            />
            
            {isDrawing && dragBox && (
              <div className="absolute border border-dashed border-red-500 bg-red-500/20 pointer-events-none z-50" style={{ left: dragBox.x, top: dragBox.y, width: dragBox.w, height: dragBox.h }} />
            )}
            
            <div className="absolute inset-0 top-0 left-0 w-full h-full pointer-events-auto">
              {rois.map((roi) => (
                <Rnd
                  key={roi.id}
                  size={{ width: roi.width, height: roi.height }}
                  position={{ x: roi.x, y: roi.y }}
                  onMouseDown={(e) => { e.stopPropagation(); setSelectedId(roi.id); }}
                  onDragStop={(e, d) => updateROI(roi.id, { x: d.x, y: d.y })}
                  onResizeStop={(e, dir, ref, delta, pos) => {
                    updateROI(roi.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos });
                  }}
                  bounds="parent"
                  className={`rnd-box-item border transition-shadow ${selectedId === roi.id ? "border-blue-500 bg-blue-500/10 shadow-md z-30" : "border-slate-400 bg-slate-500/5 z-20"}`}
                  resizeHandleStyles={selectedId === roi.id ? { topLeft: handleStyle, topRight: handleStyle, bottomLeft: handleStyle, bottomRight: handleStyle, top: handleStyle, right: handleStyle, bottom: handleStyle, left: handleStyle } : {}}
                  disableDragging={activeTool === 'pan'}
                >
                  <div className="w-full h-full relative">
                    <span className={`absolute -top-5 left-0 px-1 py-0.5 text-[9px] font-mono rounded shadow border ${selectedId === roi.id ? "bg-blue-600 border-blue-500 text-white font-bold" : "bg-white border-slate-300 text-slate-600"}`}>
                      {roi.fieldName}
                    </span>
                  </div>
                </Rnd>
              ))}
            </div>
          </div>
        </div>

        {/* 🎛️ RIGHT SIDEBAR: PROPERTIES PANEL */}
        <div className="col-span-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-4 overflow-y-auto h-full">
          
          {/* 🎯 ปุ่มย้อนกลับไปหน้าครอบตัด (Back to Pre-processing Panel) */}
          <button
            type="button"
            onClick={onBackToAdjust}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft size={14} /> ย้อนกลับไปหน้าครอบตัดรูปภาพ
          </button>

          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Active Fields ({rois.length})</h3>
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {rois.map((roi) => (
                <div 
                  key={roi.id} 
                  onClick={() => setSelectedId(roi.id)} 
                  className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-all ${selectedId === roi.id ? "bg-blue-50 border-blue-400 text-slate-800 font-medium" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Move size={12} className="text-slate-400 shrink-0" />
                    <input 
                      type="text" 
                      value={roi.fieldName} 
                      onChange={(e) => updateROI(roi.id, { fieldName: e.target.value })} 
                      className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full cursor-text" 
                      onClick={(e) => e.stopPropagation()} 
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteROI(roi.id); }} 
                    className="text-slate-400 hover:text-red-500 ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button disabled={rois.length === 0 || isLoading} onClick={handleRunOCR} className="w-full py-3 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm">{isLoading ? "Running AI Engine..." : "Analyze OCR Channels"}</button>
        </div>
      </div>

      {/* 📝 BOTTOM LAYER: GROUND TRUTH EDITOR */}
      {ocrResults.length > 0 && (
        <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-md animate-fade-in mt-6">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Edit3 size={16} /> Step 3: Ground Truth Data Editor</h3>
            </div>
            <button onClick={handleApproveAndSave} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-green-600/10">Approve & Commit Sync</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 font-mono text-slate-500 border-b">
                <tr><th className="px-5 py-3">Field Channel</th><th className="px-5 py-3">Confidence</th><th className="px-5 py-3">Value Override</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ocrResults.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-blue-600">{res.fieldName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${res.confidence >= 0.8 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {(res.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <input type="text" value={res.extractedText} onChange={(e) => setOcrResults(p => p.map(item => item.id === res.id ? { ...item, extractedText: e.target.value } : item))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}