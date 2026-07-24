'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import { Project, ProjectStatus, UserProfile } from '@/types';
import { imfexStore } from '@/lib/store';
import {
  Briefcase,
  ArrowLeft,
  User,
  Truck,
  MapPin,
  CheckCircle2,
  Save,
  Camera,
  FileCheck,
  PenTool,
  Building2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const router = useRouter();
  const projectId = resolvedParams?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');
  const [responsibleUserId, setResponsibleUserId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('');
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');
  const [procurementStatus, setProcurementStatus] = useState('');
  const [procurementNotes, setProcurementNotes] = useState('');
  const [installationTeam, setInstallationTeam] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [installationAddress, setInstallationAddress] = useState('');
  const [installationContact, setInstallationContact] = useState('');
  const [installationMinutes, setInstallationMinutes] = useState('');

  // Photos & Signature state
  const [photos, setPhotos] = useState<string[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setProfiles(imfexStore.getProfiles());
    if (projectId) {
      const prj = imfexStore.getProjectById(projectId);
      if (prj) {
        setProject(prj);
        setStatus(prj.status);
        setResponsibleUserId(prj.responsibleUserId || '');
        setStartDate(prj.startDate || '');
        setTargetDeliveryDate(prj.targetDeliveryDate || '');
        setActualDeliveryDate(prj.actualDeliveryDate || '');
        setProcurementStatus(prj.procurementStatus || 'NOT_STARTED');
        setProcurementNotes(prj.procurementNotes || '');
        setInstallationTeam(prj.installationTeam || '');
        setInstallationDate(prj.installationDate || '');
        setInstallationAddress(prj.installationAddress || '');
        setInstallationContact(prj.installationContact || '');
        setInstallationMinutes(prj.installationMinutes || '');
        setPhotos(prj.photos || ['https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop']);
        setSignatureData(prj.signatureUrl || '');
      }
    }
  }, [projectId]);

  const handleSaveProject = (overridingStatus?: ProjectStatus) => {
    if (!project) return;
    const nextStatus = overridingStatus || status;

    const updated: Project = {
      ...project,
      status: nextStatus,
      responsibleUserId,
      responsibleUser: profiles.find((p) => p.id === responsibleUserId),
      startDate,
      targetDeliveryDate,
      actualDeliveryDate,
      procurementStatus,
      procurementNotes,
      installationTeam,
      installationDate,
      installationAddress,
      installationContact,
      installationMinutes,
      signatureUrl: signatureData,
      photos,
    };

    const saved = imfexStore.saveProject(updated);
    setProject(saved);
    setStatus(nextStatus);

    if (nextStatus === 'CLOSED') {
      alert(`Проектот ${saved.projectNumber} е успешно ЗАТВОРЕН! Опремата е регистрирана во историјата за сервис.`);
    } else {
      alert(`Проектот ${saved.projectNumber} е успешно ажуриран.`);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData('');
    }
  };

  const handleAddSamplePhoto = () => {
    const sampleUrls = [
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop',
    ];
    const pick = sampleUrls[photos.length % sampleUrls.length];
    setPhotos((prev) => [...prev, pick]);
  };

  if (!project) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Се вчитуваат детали за проектот...</div>;
  }

  return (
    <div className="space-y-6 pb-24 text-xs">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/projects')}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <span>Управување со Проект {project.projectNumber}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('offers.offer_number')}: {project.offer?.offerNumber} • Клиент: {project.customer?.companyName || project.customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status !== 'CLOSED' && (
            <button
              onClick={() => handleSaveProject('CLOSED')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> {t('projects.close_project')}
            </button>
          )}
          <button
            onClick={() => handleSaveProject()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" /> {t('projects.save_changes')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Card 1: Project Control */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-primary" /> {t('projects.project_control')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-primary outline-none"
                >
                  <option value="PLANNED">{t('projects.planned')}</option>
                  <option value="PROCUREMENT">{t('projects.in_procurement')}</option>
                  <option value="PRODUCTION">{t('projects.in_production')}</option>
                  <option value="INSTALLATION">{t('projects.scheduled')}</option>
                  <option value="COMPLETED">{t('projects.completed')}</option>
                  <option value="CLOSED">{t('projects.closed')}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.responsible')}</label>
                <select
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                >
                  <option value="">-- Избери Одговорно Лице --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.start_date')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.target_deadline')}</label>
                  <input
                    type="date"
                    value={targetDeliveryDate}
                    onChange={(e) => setTargetDeliveryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background outline-none font-bold text-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Customer Summary */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-2">
              <Building2 className="w-4 h-4 text-primary" /> Податоци за Клиентот
            </h3>
            <p className="font-bold text-foreground">{project.customer?.companyName || project.customer?.name}</p>
            <p className="text-muted-foreground">{project.customer?.email} • {project.customer?.phone}</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Card 3: Procurement */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Truck className="w-4 h-4 text-primary" /> {t('projects.procurement')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">Статус на Набавка</label>
                <select
                  value={procurementStatus}
                  onChange={(e) => setProcurementStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                >
                  <option value="NOT_STARTED">НЕ Е ЗАПОЧНАТО</option>
                  <option value="ORDERED">ПОРАЧАНО ОД ФАБРИКА</option>
                  <option value="IN_PRODUCTION">ВО ПРОИЗВОДСТВО</option>
                  <option value="DELIVERED">ИСПОРАЧАНО ВО МАГАЦИН</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.actual_delivery')}</label>
                <input
                  type="date"
                  value={actualDeliveryDate}
                  onChange={(e) => setActualDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.procurement_notes')}</label>
              <textarea
                rows={2}
                value={procurementNotes}
                onChange={(e) => setProcurementNotes(e.target.value)}
                placeholder="Забелешки за набавка и фабрички броеви..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
              />
            </div>
          </div>

          {/* Card 4: Installation Planning */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <MapPin className="w-4 h-4 text-primary" /> {t('projects.installation')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.installation_team')}</label>
                <input
                  type="text"
                  value={installationTeam}
                  onChange={(e) => setInstallationTeam(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.installation_date')}</label>
                <input
                  type="date"
                  value={installationDate}
                  onChange={(e) => setInstallationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold text-orange-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.installation_address')}</label>
                <input
                  type="text"
                  value={installationAddress}
                  onChange={(e) => setInstallationAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.installation_contact')}</label>
                <input
                  type="text"
                  value={installationContact}
                  onChange={(e) => setInstallationContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Handover */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" /> {t('projects.handover')}
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-primary" /> {t('projects.installation_photos')} ({photos.length})
                </label>
                <button onClick={handleAddSamplePhoto} className="text-primary font-bold hover:underline cursor-pointer">
                  {t('projects.add_photo')}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((src, idx) => (
                  <div key={idx} className="relative group border border-border rounded-lg overflow-hidden h-24 bg-muted">
                    <img src={src} alt="Install Photo" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-foreground">
                {t('projects.handover_minutes')}
              </label>
              <textarea
                rows={3}
                value={installationMinutes}
                onChange={(e) => setInstallationMinutes(e.target.value)}
                placeholder="Записник од тестирање, подесување на граничници..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-primary" /> {t('projects.signature')}
                </label>
                <button type="button" onClick={clearCanvas} className="text-red-500 font-bold hover:underline cursor-pointer">
                  {t('projects.clear_signature')}
                </button>
              </div>

              <div className="border border-border rounded-xl bg-background p-2 flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawingTouch}
                  onTouchMove={drawTouch}
                  onTouchEnd={stopDrawing}
                  className="bg-card border border-dashed border-border rounded-lg cursor-crosshair touch-none w-full max-w-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
