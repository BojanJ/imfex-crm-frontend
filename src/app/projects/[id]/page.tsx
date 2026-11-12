'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';
import {
  Project,
  ProjectStatus,
  ProjectAttachment,
  ProjectFileCategory,
  UserProfile,
  SalesInvoice,
  DispatchNote,
} from '@/types';
import { imfexStore, useImfexStore, getApiUrl } from '@/lib/store';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { AdvancePaymentModal } from '@/components/finance/advance-payment-modal';
import { FinancePdfModal } from '@/components/pdf/printable-finance-document';
import { toast } from '@/components/ui/toastr';
import {
  Briefcase,
  ArrowLeft,
  User,
  Truck,
  MapPin,
  CheckCircle2,
  Save,
  FileCheck,
  PenTool,
  Building2,
  Loader2,
  Euro,
  FileText,
  TrendingUp,
  Paperclip,
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Eye,
  X,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB per file (safe for localStorage persistence)

function detectFileCategory(fileName: string, mimeType: string): ProjectFileCategory {
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (lowerMime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/i.test(lowerName)) {
    return 'IMAGE';
  }
  if (lowerMime === 'application/pdf' || /\.pdf$/i.test(lowerName)) {
    return 'PDF';
  }
  if (
    lowerMime.includes('excel') ||
    lowerMime.includes('spreadsheet') ||
    lowerMime === 'text/csv' ||
    /\.(xls|xlsx|csv|ods)$/i.test(lowerName)
  ) {
    return 'EXCEL';
  }
  if (
    lowerMime.includes('word') ||
    lowerMime.includes('msword') ||
    lowerMime.includes('wordprocessingml') ||
    /\.(doc|docx|rtf|odt)$/i.test(lowerName)
  ) {
    return 'WORD';
  }
  return 'OTHER';
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const router = useRouter();
  const projectId = resolvedParams?.id;
  useImfexStore(); // Auto-subscribe to store state changes

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

  // Global Project Attachments & Signature state
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [fileFilter, setFileFilter] = useState<'ALL' | ProjectFileCategory>('ALL');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<ProjectAttachment | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string>('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | null>(null);
  const [previewDispatch, setPreviewDispatch] = useState<DispatchNote | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyProjectData = (prj: Project) => {
    const resolvedAtts =
      prj.attachments && prj.attachments.length > 0
        ? prj.attachments
        : imfexStore.getProjectAttachments(prj.id);
    setProject({ ...prj, attachments: resolvedAtts });
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
    setAttachments(resolvedAtts);
    setSignatureData(prj.signatureUrl || '');
  };

  useEffect(() => {
    setProfiles(imfexStore.getProfiles());
    if (!projectId) return;

    // 1. Check local store
    const local = imfexStore.getProjectById(projectId);
    if (local) {
      applyProjectData(local);
      setIsLoading(false);
      return;
    }

    // 2. Fetch directly from backend API
    const baseUrl = getApiUrl();
    fetch(`${baseUrl}/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          applyProjectData(data);
        } else {
          const storeFound = imfexStore.getProjectById(projectId);
          if (storeFound) applyProjectData(storeFound);
        }
      })
      .catch((err) => console.warn('Fetch project notice:', err))
      .finally(() => setIsLoading(false));
  }, [projectId, imfexStore.isLoadedFromBackend, imfexStore.getProjects().length]);

  const executeSaveProject = (overridingStatus?: ProjectStatus) => {
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
      attachments,
    };

    const saved = imfexStore.saveProject(updated);
    setProject(saved);
    setStatus(nextStatus);

    if (nextStatus === 'CLOSED') {
      toast.success(
        `Проектот ${saved.projectNumber} е ЗАТВОРЕН!`,
        'Опремата е регистрирана во историјата за сервис.'
      );
    } else {
      toast.success(`Проектот ${saved.projectNumber} е зачуван!`, 'Сите промени се успешно ажурирани.');
    }
  };

  const handleSaveProject = (overridingStatus?: ProjectStatus) => {
    if (!project) return;
    const targetStatus = overridingStatus || status;
    if (targetStatus === 'CLOSED') {
      setConfirmState({
        isOpen: true,
        title: 'Затвори Проект',
        message: `Дали сте сигурни дека сакате да го ЗАТВОРИТЕ проектот „${project.projectNumber}“? Статусот ќе се промени во CLOSED.`,
        variant: 'success',
        confirmLabel: 'Затвори Проект',
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          executeSaveProject('CLOSED');
        },
      });
      return;
    }
    if (targetStatus !== project.status) {
      setConfirmState({
        isOpen: true,
        title: 'Промена на статус на проект',
        message: `Дали сте сигурни дека сакате да го промените статусот на проектот „${project.projectNumber}“ од „${project.status}“ во „${targetStatus}“?`,
        variant: 'warning',
        confirmLabel: 'Да, промени статус',
        onConfirm: () => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          executeSaveProject(targetStatus);
        },
      });
      return;
    }
    executeSaveProject(overridingStatus);
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

  const handleFilesUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !project) return;
    const filesArray = Array.from(fileList);

    filesArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `Фајлот „${file.name}“ е преголем (${formatFileSize(file.size)})`,
          'Максималната дозволена големина по фајл е 3 MB.'
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        const category = detectFileCategory(file.name, file.type);
        const newAtt: ProjectAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          projectId: project.id,
          customerId: project.customerId,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          category,
          sizeBytes: file.size,
          dataUrl,
          uploadedBy: imfexStore.getCurrentUser()?.fullName || 'IMFEX Тим',
          createdAt: new Date().toISOString(),
        };
        const { attachments: updatedList, persisted } = imfexStore.addProjectAttachment(project.id, newAtt);
        setAttachments(updatedList);
        setProject((prev) => (prev ? { ...prev, attachments: updatedList } : prev));
        if (persisted) {
          toast.success(`Фајлот „${file.name}“ е прикачен`, `${category} • ${formatFileSize(file.size)}`);
        } else {
          toast.warning(
            `Фајлот „${file.name}“ е додаден во оваа сесија, но не е зачуван трајно`,
            'Локалната меморија на прелистувачот е полна (премногу/преголеми фајлови).'
          );
        }
      };
      reader.onerror = () => {
        toast.error(`Грешка при читање на фајлот „${file.name}“`);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!previewAttachment || !previewAttachment.dataUrl) {
      setPreviewBlobUrl('');
      return;
    }
    if (!previewAttachment.dataUrl.startsWith('data:')) {
      setPreviewBlobUrl(previewAttachment.dataUrl);
      return;
    }
    let objectUrl = '';
    try {
      const parts = previewAttachment.dataUrl.split(',');
      const meta = parts[0] || '';
      const base64Data = parts[1] || '';
      const mimeMatch = meta.match(/data:([^;]+);base64/);
      const mime = mimeMatch ? mimeMatch[1] : previewAttachment.mimeType || 'application/octet-stream';
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: mime });
      objectUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(objectUrl);
    } catch (e) {
      setPreviewBlobUrl(previewAttachment.dataUrl);
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewAttachment]);

  const handleDeleteAttachment = (att: ProjectAttachment) => {
    if (!project) return;
    setConfirmState({
      isOpen: true,
      title: 'Избриши Прикачен Фајл',
      message: `Дали сте сигурни дека сакате да го избришете фајлот „${att.name}“ од проектот „${project.projectNumber}“?`,
      variant: 'danger',
      confirmLabel: 'Да, избриши',
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        const nextList = imfexStore.deleteProjectAttachment(project.id, att.id);
        setAttachments(nextList);
        setProject((prev) => (prev ? { ...prev, attachments: nextList } : prev));
        if (previewAttachment?.id === att.id) {
          setPreviewAttachment(null);
        }
        toast.info(`Фајлот „${att.name}“ е избришан`);
      },
    });
  };

  if (isLoading && !project && !imfexStore.isLoadedFromBackend) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span>Се вчитуваат детали за проектот од базата...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm text-xs">
        <p className="text-sm font-bold text-red-500">Проектот не е пронајден</p>
        <p className="text-muted-foreground">
          Бараниот проект (ID: <code className="font-mono">{projectId}</code>) не постои или е избришан.
        </p>
        <div className="pt-2">
          <button
            onClick={() => router.push('/projects')}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Назад кон Проекти
          </button>
        </div>
      </div>
    );
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
                <SearchableSelect
                  options={[
                    { value: 'PLANNED', label: t('projects.planned') },
                    { value: 'PROCUREMENT', label: t('projects.in_procurement') },
                    { value: 'PRODUCTION', label: t('projects.in_production') },
                    { value: 'INSTALLATION', label: t('projects.scheduled') },
                    { value: 'COMPLETED', label: t('projects.completed') },
                    { value: 'CLOSED', label: t('projects.closed') },
                  ]}
                  value={status}
                  onChange={(val) => {
                    const nextSt = val as ProjectStatus;
                    if (nextSt === status) return;
                    setConfirmState({
                      isOpen: true,
                      title: 'Промена на Статус на Проект',
                      message: `Дали сте сигурни дека сакате да го промените статусот на проектот „${project.projectNumber}“ од „${status}“ во „${nextSt}“?`,
                      variant: 'warning',
                      confirmLabel: 'Потврди Промена',
                      onConfirm: () => {
                        setConfirmState((prev) => ({ ...prev, isOpen: false }));
                        setStatus(nextSt);
                        executeSaveProject(nextSt);
                      },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-extrabold text-primary outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.responsible')}</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Избери Одговорно Лице --' },
                    ...profiles.map((p) => ({
                      value: p.id,
                      label: `${p.fullName} (${p.role})`,
                    })),
                  ]}
                  value={responsibleUserId}
                  onChange={(val) => setResponsibleUserId(val)}
                  placeholder="-- Избери Одговорно Лице --"
                  searchPlaceholder="Пребарај лице..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                />
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
          {/* Card 2.5: 5-Step Warehouse & Order Flow (matching Products & Warehouse Flow) */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" /> Оперативен тек: Понуда → Аванс → Набавка → Магацин → Испратница
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                МАГАЦИН ПОВРЗАН
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-background/60 border border-border rounded-xl space-y-3">
                <b className="text-xs font-bold text-foreground block">Понуди и аванс</b>
                <p className="text-[11px] text-muted-foreground">
                  Понуда V1 → теренско мерење → понуда V2 (финална). При прифаќање се резервираат достапните додатоци.
                </p>
                <div>
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      project.acceptedAt || project.offerId
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {project.acceptedAt || project.offerId ? 'Финална понуда прифатена' : 'Чека прифаќање'}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={Boolean(project.acceptedAt || project.offerId)}
                    onClick={() => {
                      setConfirmState({
                        isOpen: true,
                        title: 'Прифати Финална Понуда',
                        message: `Дали сте сигурни дека сакате да ја потврдите финалната понуда за проектот „${project.projectNumber}“?`,
                        variant: 'primary',
                        confirmLabel: 'Потврди Понуда',
                        onConfirm: () => {
                          setConfirmState((prev) => ({ ...prev, isOpen: false }));
                          const updated = imfexStore.saveProject({ ...project, acceptedAt: new Date().toISOString() });
                          applyProjectData(updated);
                        },
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 cursor-pointer block"
                  >
                    1. Прифати финална понуда
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(project.advancePaid)}
                    onClick={() => setShowAdvanceModal(true)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer block"
                  >
                    2. Евидентирај уплата на аванс (со избор)
                  </button>
                </div>
              </div>

              <div className="p-4 bg-background/60 border border-border rounded-xl space-y-3">
                <b className="text-xs font-bold text-foreground block">Набавка и магацин</b>
                <div>
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      project.supplierOrdered || procurementStatus === 'ORDERED' || procurementStatus === 'DELIVERED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {project.supplierOrdered || procurementStatus === 'ORDERED' || procurementStatus === 'DELIVERED'
                      ? 'Вратата е нарачана'
                      : 'Не е нарачана'}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={!project.advancePaid || Boolean(project.supplierOrdered || procurementStatus === 'ORDERED' || procurementStatus === 'DELIVERED')}
                    onClick={() => {
                      setConfirmState({
                        isOpen: true,
                        title: 'Нарачај кај Добавувач',
                        message: `Дали сте сигурни дека сакате да го промените статусот во Нарачано кај добавувач за проектот „${project.projectNumber}“?`,
                        variant: 'warning',
                        confirmLabel: 'Потврди Нарачка',
                        onConfirm: () => {
                          setConfirmState((prev) => ({ ...prev, isOpen: false }));
                          const updated = imfexStore.projectStepOrderSupplier(project.id);
                          if (updated) applyProjectData(updated);
                        },
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer block"
                  >
                    3. Нарачај кај добавувач
                  </button>
                  <button
                    type="button"
                    disabled={!(project.supplierOrdered || procurementStatus === 'ORDERED') || Boolean(project.warehouseReceived || procurementStatus === 'DELIVERED')}
                    onClick={() => {
                      setConfirmState({
                        isOpen: true,
                        title: 'Прими Врата во Магацин',
                        message: `Дали сте сигурни дека сакате да потврдите прием на вратата во магацин за проектот „${project.projectNumber}“?`,
                        variant: 'success',
                        confirmLabel: 'Потврди Прием',
                        onConfirm: () => {
                          setConfirmState((prev) => ({ ...prev, isOpen: false }));
                          const updated = imfexStore.projectStepReceiveWarehouse(project.id);
                          if (updated) applyProjectData(updated);
                        },
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:brightness-110 disabled:opacity-50 cursor-pointer block"
                  >
                    4. Прими врата во магацин
                  </button>
                  <button
                    type="button"
                    disabled={!(project.warehouseReceived || procurementStatus === 'DELIVERED') || Boolean(project.dispatchIssued)}
                    onClick={() => {
                      setConfirmState({
                        isOpen: true,
                        title: 'Издај Испратница и Раздолжи Залиха',
                        message: `Дали сте сигурни дека сакате да издадете испратница и да ја раздолжите залихата од магацин за проектот „${project.projectNumber}“?`,
                        variant: 'warning',
                        confirmLabel: 'Издај Испратница',
                        onConfirm: () => {
                          setConfirmState((prev) => ({ ...prev, isOpen: false }));
                          const updated = imfexStore.projectStepIssueDispatch(project.id);
                          if (updated) applyProjectData(updated);
                          const offer = project.offerId ? imfexStore.getOfferById(project.offerId) : project.offer;
                          const note = imfexStore.saveDispatchNote({
                            id: `disp-${Date.now()}`,
                            dispatchNumber: imfexStore.generateDispatchNumber(),
                            status: 'ISSUED',
                            customerId: project.customerId,
                            customer: project.customer,
                            projectId: project.id,
                            offerId: project.offerId,
                            issueDate: new Date().toISOString().split('T')[0],
                            deliveryAddress: project.installationAddress || project.customer?.address,
                            receivedBy: project.customer?.companyName || project.customer?.name,
                            issuedBy: imfexStore.getCurrentUser()?.fullName || 'Магацин IMFEX',
                            items: (offer?.items || []).map((it, i) => ({
                              id: `di-${Date.now()}-${i}`,
                              productId: it.productId,
                              title: it.customTitle || 'Врата и опрема',
                              quantity: Number(it.quantity || 1),
                            })),
                            stockDeducted: true,
                            createdAt: new Date().toISOString(),
                          });
                          setPreviewDispatch(note);
                        },
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:brightness-110 disabled:opacity-50 cursor-pointer block"
                  >
                    5. Издај испратница (PDF + Раздолжи залиха)
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground">
              <b>Состојба:</b>{' '}
              {project.dispatchIssued
                ? 'Испратница издадена — следува монтажа, протокол и финална фактура.'
                : project.warehouseReceived || procurementStatus === 'DELIVERED'
                ? 'Вратата е примена и поврзана со проектот.'
                : project.supplierOrdered || procurementStatus === 'ORDERED'
                ? 'Се чека пристигнување на вратата.'
                : project.advancePaid
                ? 'Авансот е платен — може да се нарача вратата.'
                : 'Чека авансна уплата.'}
            </div>
          </div>

          {/* Card 2.8: Real-Time Project Profitability & Invoices */}
          {(() => {
            const fin = imfexStore.getProjectFinancialSummary(project.id);
            return (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Финансиски биланс и Добивка по Проект (Реално време)</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvanceModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Euro className="w-3.5 h-3.5" /> Евидентирај Аванс
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmState({
                          isOpen: true,
                          title: 'Издај Конечна Фактура',
                          message: `Дали сте сигурни дека сакате да издадете Конечна Фактура (со автоматски одбиен аванс) за проектот „${project.projectNumber}“?`,
                          variant: 'primary',
                          confirmLabel: 'Издај Конечна Фактура',
                          onConfirm: () => {
                            setConfirmState((prev) => ({ ...prev, isOpen: false }));
                            const finalInv = imfexStore.createSalesInvoiceFromOfferOrProject({
                              invoiceType: 'FINAL',
                              projectId: project.id,
                              offerId: project.offerId,
                              customerId: project.customerId,
                            });
                            setPreviewInvoice(finalInv);
                            toast.success(
                              `Креирана Конечна Фактура ${finalInv.invoiceNumber}`,
                              finalInv.advanceDeductedAmount > 0
                                ? `Одбиен аванс: -€${finalInv.advanceDeductedAmount.toFixed(2)}`
                                : 'Подготвена за печатење.'
                            );
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] hover:brightness-110 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> Издај Конечна Фактура (со одбиен аванс)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Продажна вредност
                    </span>
                    <strong className="text-base font-black text-foreground mt-1 block">
                      €{fin.agreedRevenue.toFixed(2)}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Уплатено / Остаток
                    </span>
                    <strong className="text-base font-black text-emerald-500 mt-1 block">
                      €{fin.paidByCustomer.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      Долг: €{fin.remainingToPay.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Набавка на стока
                    </span>
                    <strong className="text-base font-black text-sky-400 mt-1 block">
                      €{fin.stockPurchaseCost.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      {fin.hasActualStockInvoice ? 'Од влезна фактура' : 'Пресметана набавна'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-border">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Трошоци на проект
                    </span>
                    <strong className="text-base font-black text-amber-500 mt-1 block">
                      €{fin.directExpensesCost.toFixed(2)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground">
                      Гориво, штрафчиња, ситно
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-400 block">
                      Чиста Добивка (Маржа)
                    </span>
                    <strong className="text-base font-black text-emerald-400 mt-1 block">
                      €{fin.netProfit.toFixed(2)} ({fin.marginPercent}%)
                    </strong>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 3: Procurement */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Truck className="w-4 h-4 text-primary" /> {t('projects.procurement')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">Статус на Набавка</label>
                <SearchableSelect
                  options={[
                    { value: 'NOT_STARTED', label: 'НЕ Е ЗАПОЧНАТО' },
                    { value: 'ORDERED', label: 'ПОРАЧАНО ОД ФАБРИКА' },
                    { value: 'IN_PRODUCTION', label: 'ВО ПРОИЗВОДСТВО' },
                    { value: 'DELIVERED', label: 'ИСПОРАЧАНО ВО МАГАЦИН' },
                  ]}
                  value={procurementStatus}
                  onChange={(val) => setProcurementStatus(val)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold outline-none"
                />
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

          {/* Card 6: Global Project Documents & File Attachments */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary" />
                  <span>{t('projects.project_files')}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                    {attachments.length}
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t('projects.project_files_subtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> {t('projects.upload_files')}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,*/*"
                onChange={(e) => handleFilesUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDraggingFiles) setIsDraggingFiles(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDraggingFiles(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingFiles(false);
                handleFilesUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDraggingFiles
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-border bg-background/50 hover:border-primary/60 hover:bg-muted/30'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="font-bold text-xs text-foreground">
                  {t('projects.drop_files_here')}
                </p>
                <p className="text-[11px] text-muted-foreground max-w-md">
                  {t('projects.supported_formats')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    JPG / PNG / WEBP
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    PDF
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    EXCEL (.XLS / .XLSX / .CSV)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    WORD (.DOC / .DOCX)
                  </span>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs */}
            {attachments.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { key: 'ALL', label: t('projects.filter_all') },
                    { key: 'IMAGE', label: t('projects.filter_images') },
                    { key: 'PDF', label: t('projects.filter_pdf') },
                    { key: 'EXCEL', label: t('projects.filter_excel') },
                    { key: 'WORD', label: t('projects.filter_word') },
                    { key: 'OTHER', label: t('projects.filter_other') },
                  ] as const
                ).map((tab) => {
                  const count =
                    tab.key === 'ALL'
                      ? attachments.length
                      : attachments.filter((a) => a.category === tab.key).length;
                  if (tab.key !== 'ALL' && count === 0) return null;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFileFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        fileFilter === tab.key
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attached Files List / Grid */}
            {(() => {
              const visibleAttachments =
                fileFilter === 'ALL'
                  ? attachments
                  : attachments.filter((a) => a.category === fileFilter);

              if (visibleAttachments.length === 0) {
                return (
                  <div className="p-6 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('projects.no_files')}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleAttachments.map((att) => {
                    const isPreviewable = att.category === 'IMAGE' || att.category === 'PDF';
                    const badgeStyle =
                      att.category === 'IMAGE'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : att.category === 'PDF'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : att.category === 'EXCEL'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : att.category === 'WORD'
                        ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                    return (
                      <div
                        key={att.id}
                        className="p-3 rounded-xl border border-border bg-background/70 hover:border-primary/40 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {att.category === 'IMAGE' ? (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-muted shrink-0 cursor-pointer group relative"
                              title={t('projects.file_preview')}
                            >
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 ${badgeStyle}`}
                            >
                              {att.category === 'PDF' ? (
                                <FileText className="w-6 h-6" />
                              ) : att.category === 'EXCEL' ? (
                                <FileSpreadsheet className="w-6 h-6" />
                              ) : att.category === 'WORD' ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <File className="w-6 h-6" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p
                              className="font-bold text-xs text-foreground truncate"
                              title={att.name}
                            >
                              {att.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${badgeStyle}`}
                              >
                                {att.category}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {formatFileSize(att.sizeBytes)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                • {new Date(att.createdAt).toLocaleDateString('mk-MK')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isPreviewable && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title={t('projects.file_preview')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          <a
                            href={att.dataUrl}
                            download={att.name}
                            className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            title={t('projects.file_download')}
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title={t('projects.file_delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Advance Payment Modal */}
      <AdvancePaymentModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        project={project}
        onSuccess={({ project: updatedPrj, advanceInvoice }) => {
          if (updatedPrj) applyProjectData(updatedPrj);
          if (advanceInvoice) setPreviewInvoice(advanceInvoice);
        }}
      />

      {/* Official Finance Invoice / Dispatch PDF Modal */}
      <FinancePdfModal
        isOpen={Boolean(previewInvoice || previewDispatch)}
        onClose={() => {
          setPreviewInvoice(null);
          setPreviewDispatch(null);
        }}
        invoice={previewInvoice}
        dispatchNote={previewDispatch}
      />

      {/* Attachment Preview Modal (Images & PDF) */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                {previewAttachment.category === 'IMAGE' ? (
                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {previewAttachment.name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {previewAttachment.category} • {formatFileSize(previewAttachment.sizeBytes)} •{' '}
                    {new Date(previewAttachment.createdAt).toLocaleDateString('mk-MK')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.dataUrl}
                  download={previewAttachment.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> {t('projects.file_download')}
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-background/50">
              {previewAttachment.category === 'IMAGE' ? (
                <img
                  src={previewBlobUrl || previewAttachment.dataUrl}
                  alt={previewAttachment.name}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg"
                />
              ) : previewAttachment.category === 'PDF' ? (
                <iframe
                  src={previewBlobUrl || previewAttachment.dataUrl}
                  title={previewAttachment.name}
                  className="w-full h-[75vh] rounded-lg border border-border bg-white"
                />
              ) : (
                <div className="p-12 text-center space-y-3">
                  <p className="text-muted-foreground">
                    Овој формат ({previewAttachment.category}) се презема директно на вашиот уред.
                  </p>
                  <a
                    href={previewAttachment.dataUrl}
                    download={previewAttachment.name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                  >
                    <Download className="w-4 h-4" /> {t('projects.file_download')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
