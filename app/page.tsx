import UploadZone from "../src/components/UploadZone";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-8">
          Intelligent OCR Portal
        </h1>
        <UploadZone />
      </div>
    </main>
  );
}