"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Save, ArrowLeft, Anchor, Cpu, Database, CheckSquare, Key } from 'lucide-react';

export default function TemplateRegistrationPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [templateName, setTemplateName] = useState("Thai Railway Ticket Template");
  const [documentImage, setDocumentImage] = useState<string>("");

  // ระบบจำลองตรวจสอบ ID แล้วดึงภาพที่เกี่ยวข้องตาม Request ID จริง
  useEffect(() => {
    if (id === 'REQ-2026-001' || id === 'REQ-2026-003') {
      // ดึงภาพตั๋วรถไฟไทยตัวอย่างมาแสดงผล
      setTemplateName("Thai Railway Ticket Template");
      setDocumentImage("https://www.railway.co.th/Images/PR/D-ticket.jpg"); // หรือใส่พาร์ทรูปในเครื่องของคุณได้
    } else {
      // บิลอื่นๆ เช่น CDG Invoice
      setTemplateName("Invoice CDG Group Template");
      setDocumentImage(""); // ภาพว่าง หรือภาพบิลอื่น
    }
  }, [id]);
  
  const [anchorKeywords, setAnchorKeywords] = useState([
    { id: 1, keyword: "การรถไฟแห่งประเทศไทย", minConfidence: 85 },
    { id: 2, keyword: "ตั๋วโดยสาร", minConfidence: 80 }
  ]);

  const [keyFields, setKeyFields] = useState([
    { id: 1, key: "date_issue", type: "Date", regex: "\\d{2} [ก-ฮ]{2}\\.[ก-ฮ]\\. \\d{4}", isRequired: true },
    { id: 2, key: "total_price", type: "Number", regex: "[0-9,.]+", isRequired: true }
  ]);

  const handleSave = () => {
    alert(`[Template Confirmation] บันทึกกฎการยืนยันและการสร้าง Visual Embedding (ViT) ลงใน Qdrant สำหรับรหัส ${id} สำเร็จ!`);
    router.push('/admin/requests');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={18} /> ย้อนกลับไปหน้า Request Dashboard
        </button>
        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all text-sm">
          <Save size={18} /> Register & Sync Qdrant Database
        </button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ฝั่งซ้าย: Visual Preview (ROI Layout แบบดึงรูปภาพจริง) */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-2">
            <Anchor size={20} /> ROI Layout & Anchor Points
          </h2>
          <div className="aspect-[3/4] bg-slate-800 rounded-2xl border-2 border-slate-700 overflow-hidden relative group shadow-lg flex items-center justify-center p-2">
            
            {documentImage ? (
              /* แสดงภาพตั๋วรถไฟจริง */
              <img 
                src={documentImage} 
                alt="Document Source" 
                className="w-full h-full object-contain opacity-80"
              />
            ) : (
              <div className="text-slate-500 font-mono text-xs text-center p-4">
                 [ ไม่พบรูปภาพต้นฉบับสำหรับคำขอนี้ ]
              </div>
            )}

            {/* กล่อง Marker จำลองพิกัด ROI ทับบนตัวภาพเอกสาร */}
            {documentImage && (
              <>
                <div className="absolute top-[12%] left-[10%] border-2 border-amber-500 bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  Anchor: การรถไฟฯ
                </div>
                <div className="absolute bottom-[25%] right-[15%] border-2 border-blue-500 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                  Key: total_price
                </div>
              </>
            )}
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
             <p className="text-xs text-slate-400 italic">💡 พิกัด Layout เหล่านี้ถูกดึงผ่านสัดส่วนพิกัดจริงเพื่อจับคู่ทำ Template Recognition</p>
          </div>
        </div>

        {/* ฝั่งขวา: Configuration Form */}
        <div className="lg:col-span-7 space-y-8 bg-slate-800/40 p-6 rounded-2xl border border-slate-800">
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
              <Cpu size={20} /> 1. Template Identity Definition
            </h2>
            <input 
              type="text" 
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 border rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/60">
            <h3 className="text-sm font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <Key size={16} /> 2. Anchor Keywords Verification Rules
            </h3>
            <div className="space-y-3">
              {anchorKeywords.map((ack) => (
                <div key={ack.id} className="grid grid-cols-12 gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700/60 items-center">
                  <div className="col-span-7">
                    <input type="text" value={ack.keyword} className="w-full bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-semibold text-white" readOnly />
                  </div>
                  <div className="col-span-5">
                    <input type="number" value={ack.minConfidence} className="w-full bg-slate-900 border-none rounded-lg px-3 py-1.5 text-xs font-mono text-amber-400" readOnly />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/60">
            <h3 className="text-sm font-bold uppercase text-blue-400 flex items-center gap-1.5">
              <CheckSquare size={16} /> 3. Key Fields Extraction & Validation Map
            </h3>
            <div className="space-y-3">
              {keyFields.map((field) => (
                <div key={field.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-blue-400">{field.key}</span>
                    <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Type: {field.type}</span>
                  </div>
                  <input type="text" value={field.regex} className="w-full bg-slate-900 border-none rounded-md px-3 py-1.5 text-xs font-mono text-slate-300" readOnly />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}