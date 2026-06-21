"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Eye, Search, Filter, ClipboardList } from 'lucide-react';

// ข้อมูลจำลองคำขอขึ้นทะเบียนเทมเพลตที่ส่งมาจากฝั่ง User
const initialRequests = [
  { id: 'REQ-2026-001', docType: 'ตั๋วรถไฟไทย (รฟท.)', user: 'Chananchida S.', date: '2026-06-19', status: 'Pending', rois: 1 },
  { id: 'REQ-2026-002', docType: 'Invoice CDG Group', user: 'Anawat K.', date: '2026-06-18', status: 'Pending', rois: 4 },
  { id: 'REQ-2026-003', docType: 'Receipt 7-Eleven', user: 'Somsak Dev', date: '2026-06-15', status: 'Approved', rois: 3 },
];

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState(initialRequests);

  const handleAction = (id: string, newStatus: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
    alert(`[Admin Decision] เปลี่ยนสถานะรายการ ${id} เป็น ${newStatus} เรียบร้อยแล้ว`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Top Navbar สำหรับ Admin */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-blue-600" /> Template Request Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">ตรวจสอบความถูกต้องของโครงสร้างพิกัด (ROI Verification) ก่อนจัดเก็บลงฐานข้อมูล Qdrant</p>
        </div>
        
        {/* ค้นหาและคัดกรอง */}
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="ค้นหาบิล/เอกสาร..." 
              className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <Filter size={16} /> ตัวกรอง
          </button>
        </div>
      </div>

      {/* บล็อกสรุปสถานะ (Dashboard Stats) */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-sm text-slate-500 font-semibold">คำขอที่รอตรวจสอบ (Pending)</span>
          <span className="text-3xl font-extrabold text-amber-500 mt-2">
            {requests.filter(r => r.status === 'Pending').length} รายการ
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-sm text-slate-500 font-semibold">อนุมัติแล้ว (Approved)</span>
          <span className="text-3xl font-extrabold text-green-600 mt-2">
            {requests.filter(r => r.status === 'Approved').length} รายการ
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-sm text-slate-500 font-semibold">ปฏิเสธคำขอ (Rejected)</span>
          <span className="text-3xl font-extrabold text-red-500 mt-2">
            {requests.filter(r => r.status === 'Rejected').length} รายการ
          </span>
        </div>
      </div>

      {/* ตารางงานของแอดมิน */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">ประเภทเอกสาร</th>
              <th className="px-6 py-4">ผู้ส่งคำขอ</th>
              <th className="px-6 py-4">วันที่ส่ง</th>
              <th className="px-6 py-4">สถานะ</th>
              <th className="px-6 py-4 text-center">การจัดการ (Decision)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-slate-600">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-slate-900">{req.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {req.docType} 
                  <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded ml-2">
                    {req.rois} Fields
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{req.user}</td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-400">{req.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    req.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                    req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center gap-2">
                    
                    {/* เปลี่ยนเป็นคอมโพเนนต์ Link เพื่อกดกระโดดไปหน้าลงทะเบียนเทมเพลต (Dynamic Routing) */}
                    <Link 
                      href={`/admin/register/${req.id}`} 
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-block" 
                      title="Review & Register ROI"
                    >
                      <Eye size={18} />
                    </Link>
                    
                    {/* ปุ่ม Action จะกดได้เฉพาะบิลที่ยังเป็น Pending */}
                    {req.status === 'Pending' ? (
                      <>
                        <button 
                          onClick={() => handleAction(req.id, 'Approved')}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'Rejected')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">ประมวลผลเสร็จสิ้น</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}