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
import { imfexStore, useImfexStore } from '@/lib/store';
import {
  canDeleteRecords,
  canViewFinance,
  canWriteOperations,
  canWriteSalesFinance,
} from '@/lib/rbac';
import {
  useProjectQuery,
  useProjectNotesQuery,
  useAddProjectNoteMutation,
  useDeleteProjectNoteMutation,
  useProfilesQuery,
  useOffersQuery,
  useSalesInvoicesQuery,
  usePurchaseInvoicesQuery,
  usePaymentsQuery,
  useProductsQuery,
} from '@/lib/queries';
import { computeProjectFinancialSummary } from '@/lib/selectors';
import { generateHandoverProtocolVectorPdf } from '@/lib/pdf-generator';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { formatCurrency } from '@/lib/formatters';
import { getProjectStatusLabel, getUserRoleLabel } from '@/lib/enum-labels';
import { PageHeader, SectionCard, StatusBadge } from '@/components/ui/page-primitives';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
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
  MessageSquare,
  Send,
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

const ALLOWED_UPLOAD_EXTENSIONS = /\.(pdf|png|jpe?g|webp|gif|doc|docx|xls|xlsx|csv|txt)$/i;
const FORBIDDEN_UPLOAD_EXTENSIONS = /\.(html?|svg|js|mjs|cjs|jsx|tsx|xml|xhtml|php|sh|bat|cmd|ps1|exe|dll|msi)$/i;
const SAFE_RASTER_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const ALLOWED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]);

function isPdfHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d    // -
  );
}

function detectFileCategory(fileName: string, mimeType: string): ProjectFileCategory {
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (SAFE_RASTER_IMAGE_MIMES.has(lowerMime) || /\.(jpg|jpeg|png|gif|webp)$/i.test(lowerName)) {
    return 'IMAGE';
  }
  if (lowerMime === 'application/pdf' || /\.pdf$/i.test(lowerName)) {
    return 'PDF';
  }
  if (
    lowerMime.includes('excel') ||
    lowerMime.includes('spreadsheet') ||
    lowerMime === 'text/csv' ||
    /\.(xls|xlsx|csv)$/i.test(lowerName)
  ) {
    return 'EXCEL';
  }
  if (
    lowerMime.includes('word') ||
    lowerMime.includes('msword') ||
    lowerMime.includes('wordprocessingml') ||
    /\.(doc|docx)$/i.test(lowerName)
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
  const { t, locale } = useI18n();
  const resolvedParams = use(params);
  const router = useRouter();
  const projectId = resolvedParams?.id;
  useImfexStore(); // Subscribe to multi-step workflow mutations (advance payment, dispatch, attachments)
  const projectQuery = useProjectQuery(projectId);
  const projectNotesQuery = useProjectNotesQuery(projectId);
  const addNoteMutation = useAddProjectNoteMutation(projectId || '');
  const deleteNoteMutation = useDeleteProjectNoteMutation(projectId || '');
  const profilesQuery = useProfilesQuery();
  // Pure TanStack Query feeds for Financial Summary (IMP-08 / FE-16)
  const offersQuery = useOffersQuery();
  const salesInvoicesQuery = useSalesInvoicesQuery();
  const purchaseInvoicesQuery = usePurchaseInvoicesQuery();
  const paymentsQuery = usePaymentsQuery();
  const productsQuery = useProductsQuery();
  const [newNoteContent, setNewNoteContent] = useState('');
  const currentUser = imfexStore.getCurrentUser();
  const currentRole = currentUser?.role ?? imfexStore.getCurrentRole();
  const allowOpsWrite = canWriteOperations(currentRole);
  const showFinance = canViewFinance(currentRole);
  const allowSalesFinance = canWriteSalesFinance(currentRole);
  const allowDelete = canDeleteRecords(currentRole);

  const [project, setProject] = useState<Project | null>(null);
  const profiles: UserProfile[] = profilesQuery.data ?? imfexStore.getProfiles();
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
  const isLoading =
    (projectQuery.isPending || projectQuery.isLoading || (Boolean(projectQuery.data) && !project)) &&
    !project;
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
  const hydratedProjectIdRef = useRef<string | null>(null);

  const toDateInputVal = (val?: string | null) => {
    if (!val) return '';
    return String(val).split('T')[0];
  };

  const applyProjectData = (prj: Project) => {
    const resolvedAtts =
      prj.attachments && prj.attachments.length > 0
        ? prj.attachments
        : imfexStore.getProjectAttachments(prj.id);
    setProject({ ...prj, attachments: resolvedAtts });
    setStatus(prj.status);
    setResponsibleUserId(prj.responsibleUserId || '');
    setStartDate(toDateInputVal(prj.startDate));
    setTargetDeliveryDate(toDateInputVal(prj.targetDeliveryDate));
    setActualDeliveryDate(toDateInputVal(prj.actualDeliveryDate));
    setProcurementStatus(prj.procurementStatus || 'NOT_STARTED');
    setProcurementNotes(prj.procurementNotes || '');
    setInstallationTeam(prj.installationTeam || '');
    setInstallationDate(toDateInputVal(prj.installationDate));
    setInstallationAddress(prj.installationAddress || '');
    setInstallationContact(prj.installationContact || '');
    setInstallationMinutes(prj.installationMinutes || '');
    setAttachments(resolvedAtts);
    setSignatureData(prj.signatureUrl || '');
  };

  // Re-draw saved signature onto canvas whenever signatureData changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = signatureData;
  }, [signatureData, project?.id]);

  useEffect(() => {
    const prj = projectQuery.data;
    if (!prj || hydratedProjectIdRef.current === prj.id) return;
    hydratedProjectIdRef.current = prj.id;
    applyProjectData(prj);
  }, [projectQuery.data]);

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
      // Register project equipment into Installed Equipment history if not already registered
      const existingInstalled = imfexStore
        .getAllInstalledItems()
        .filter((i) => i.projectId === saved.id);
      if (existingInstalled.length === 0 && saved.customerId) {
        const offer = saved.offerId ? imfexStore.getOfferById(saved.offerId) : saved.offer;
        const itemsToRegister = offer?.items && offer.items.length > 0 ? offer.items : [];
        if (itemsToRegister.length > 0) {
          itemsToRegister.forEach((it, idx) => {
            imfexStore.saveInstalledItem({
              id: `inst-${Date.now()}-${idx}`,
              customerId: saved.customerId,
              projectId: saved.id,
              productId: it.productId,
              title: it.customTitle || 'Монтирана опрема',
              serialNumber: `${saved.projectNumber}-${idx + 1}`,
              installationDate: installationDate || new Date().toISOString().split('T')[0],
            });
          });
        } else {
          imfexStore.saveInstalledItem({
            id: `inst-${Date.now()}`,
            customerId: saved.customerId,
            projectId: saved.id,
            title: `Опрема по проект ${saved.projectNumber}`,
            serialNumber: saved.projectNumber,
            installationDate: installationDate || new Date().toISOString().split('T')[0],
          });
        }
      }
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

  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const touch = e.touches[0];
    if (!touch) return;
    const pt = getCanvasPoint(canvas, touch.clientX, touch.clientY);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
    ctx.lineTo(pt.x, pt.y);
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
    const touch = e.touches[0];
    if (!touch) return;
    const pt = getCanvasPoint(canvas, touch.clientX, touch.clientY);
    ctx.lineTo(pt.x, pt.y);
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
      const lowerMime = (file.type || '').toLowerCase();
      if (
        FORBIDDEN_UPLOAD_EXTENSIONS.test(file.name) ||
        !ALLOWED_UPLOAD_EXTENSIONS.test(file.name) ||
        (lowerMime && !ALLOWED_UPLOAD_MIMES.has(lowerMime))
      ) {
        toast.error(
          `Недозволен тип на фајл „${file.name}“`,
          'Дозволени се само PDF, слики (PNG/JPG/WEBP/GIF) и документи (DOC/DOCX/XLS/XLSX/CSV/TXT).'
        );
        return;
      }

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

        // Verify magic bytes for PDF before accepting
        if (category === 'PDF') {
          try {
            const base64Part = dataUrl.split(',')[1] || '';
            const headChars = atob(base64Part.slice(0, 16));
            const headBytes = new Uint8Array(headChars.length);
            for (let i = 0; i < headChars.length; i++) headBytes[i] = headChars.charCodeAt(i);
            if (!isPdfHeader(headBytes)) {
              toast.error(
                `Невалиден PDF фајл „${file.name}“`,
                'Содржината на фајлот не одговара на валиден PDF документ.'
              );
              return;
            }
          } catch {
            toast.error(`Невалиден PDF фајл „${file.name}“`);
            return;
          }
        }

        const newAtt: ProjectAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          projectId: project.id,
          customerId: project.customerId,
          name: file.name,
          mimeType: lowerMime || (category === 'PDF' ? 'application/pdf' : 'application/octet-stream'),
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
    if (!previewAttachment) {
      setPreviewBlobUrl('');
      return;
    }
    let cancelled = false;
    let objectUrl = '';

    const buildSafePreview = (dataUrl: string) => {
      if (!dataUrl || !dataUrl.startsWith('data:')) {
        setPreviewBlobUrl('');
        return;
      }
      try {
        const parts = dataUrl.split(',');
        const meta = parts[0] || '';
        const base64Data = parts[1] || '';
        const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
        const rawMime = (mimeMatch ? mimeMatch[1] : previewAttachment.mimeType || '').toLowerCase();
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        // Strictly enforce safe MIME types and PDF magic bytes to prevent stored XSS
        if (previewAttachment.category === 'PDF') {
          if (!isPdfHeader(byteNumbers)) {
            setPreviewBlobUrl('');
            return;
          }
          const blob = new Blob([byteNumbers], { type: 'application/pdf' });
          objectUrl = URL.createObjectURL(blob);
          setPreviewBlobUrl(objectUrl);
        } else if (previewAttachment.category === 'IMAGE' && SAFE_RASTER_IMAGE_MIMES.has(rawMime)) {
          const blob = new Blob([byteNumbers], { type: rawMime });
          objectUrl = URL.createObjectURL(blob);
          setPreviewBlobUrl(objectUrl);
        } else {
          setPreviewBlobUrl('');
        }
      } catch {
        setPreviewBlobUrl('');
      }
    };

    if (previewAttachment.dataUrl) {
      buildSafePreview(previewAttachment.dataUrl);
    } else if (previewAttachment.id) {
      imfexStore.fetchDocumentFileUrl(previewAttachment.id).then((resolved) => {
        if (cancelled) return;
        if (resolved) {
          setPreviewAttachment((prev) => (prev && prev.id === previewAttachment.id ? { ...prev, dataUrl: resolved } : prev));
          buildSafePreview(resolved);
        } else {
          setPreviewBlobUrl('');
        }
      });
    } else {
      setPreviewBlobUrl('');
    }

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewAttachment]);

  const handleDownloadAttachment = async (att: ProjectAttachment) => {
    let url = att.dataUrl;
    if (!url && att.id) {
      const fetched = await imfexStore.fetchDocumentFileUrl(att.id);
      if (fetched) url = fetched;
    }
    if (!url) {
      toast.error('Содржината на фајлот не може да се вчита.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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

  if (isLoading) {
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
    <div className="space-y-6 pb-20 text-xs">
      {/* Unified Minimal Page Header */}
      <PageHeader
        backHref="/projects"
        title={project.projectNumber}
        badge={
          <StatusBadge
            variant={
              status === 'COMPLETED' || status === 'CLOSED'
                ? 'success'
                : status === 'INSTALLATION'
                ? 'warning'
                : status === 'PROCUREMENT'
                ? 'purple'
                : 'primary'
            }
            dot
          >
            {getProjectStatusLabel(status, locale)}
          </StatusBadge>
        }
        subtitle={`${project.customer?.companyName || project.customer?.name || 'Клиент'}${
          project.offer?.offerNumber ? ` • ${t('offers.offer_number')}: ${project.offer.offerNumber}` : ''
        }`}
        actions={
          allowOpsWrite ? (
            <>
              {status !== 'CLOSED' && (
                <button
                  type="button"
                  onClick={() => handleSaveProject('CLOSED')}
                  className="h-9 px-3 text-xs font-medium rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('projects.close_project')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSaveProject()}
                className="h-9 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('projects.save_changes')}</span>
              </button>
            </>
          ) : undefined
        }
      />

      {!allowOpsWrite && (
        <div className="px-4 py-3 rounded-xl border border-border bg-muted/50 text-muted-foreground text-xs font-medium">
          {t('rbac.read_only_notice')}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-5 lg:sticky lg:top-20">
          {/* Card 1: Project Control */}
          <SectionCard
            title={t('projects.project_control')}
            icon={<User className="w-4 h-4" />}
          >
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('projects.status')}</label>
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
                      message: `Дали сте сигурни дека сакате да го промените статусот на проектот „${project.projectNumber}“ од „${getProjectStatusLabel(status, locale)}“ во „${getProjectStatusLabel(nextSt, locale)}“?`,
                      variant: 'warning',
                      confirmLabel: 'Потврди Промена',
                      onConfirm: () => {
                        setConfirmState((prev) => ({ ...prev, isOpen: false }));
                        setStatus(nextSt);
                        executeSaveProject(nextSt);
                      },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-medium text-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-muted-foreground">{t('projects.responsible')}</label>
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Избери Одговорно Лице --' },
                    ...profiles.map((p) => ({
                      value: p.id,
                      label: `${p.fullName} (${getUserRoleLabel(p.role, locale)})`,
                    })),
                  ]}
                  value={responsibleUserId}
                  onChange={(val) => setResponsibleUserId(val)}
                  placeholder="-- Избери Одговорно Лице --"
                  searchPlaceholder="Пребарај лице..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-medium outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block font-medium text-muted-foreground">{t('projects.start_date')}</label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    ariaLabel={t('projects.start_date')}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-background outline-none font-medium text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-medium text-muted-foreground">{t('projects.target_deadline')}</label>
                  <DatePicker
                    value={targetDeliveryDate}
                    onChange={(val) => setTargetDeliveryDate(val)}
                    ariaLabel={t('projects.target_deadline')}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-background outline-none font-medium text-xs text-amber-700 dark:text-amber-400"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Card 2: Customer Summary */}
          <SectionCard
            title="Податоци за Клиентот"
            icon={<Building2 className="w-4 h-4" />}
          >
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">
                {project.customer?.companyName || project.customer?.name}
              </p>
              <p className="text-muted-foreground">
                {[project.customer?.email, project.customer?.phone].filter(Boolean).join(' • ') || '—'}
              </p>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {/* Card 2.5: 5-Step Warehouse & Order Flow */}
          <SectionCard
            title="Оперативен тек"
            subtitle="Понуда → Аванс → Набавка → Магацин → Испратница"
            icon={<Truck className="w-4 h-4" />}
            action={<StatusBadge variant="primary">Магацин поврзан</StatusBadge>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/25 border border-border/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">Понуди и аванс</span>
                    <StatusBadge variant={project.acceptedAt || project.offerId ? 'success' : 'warning'}>
                      {project.acceptedAt || project.offerId ? 'Прифатена' : 'Чека прифаќање'}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Понуда → теренско мерење → финална потврда. При прифаќање се резервираат достапните додатоци.
                  </p>
                  <div className="space-y-2 pt-1">
                    {allowOpsWrite && (
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
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium disabled:opacity-45 cursor-pointer text-left transition-colors"
                      >
                        1. Прифати финална понуда
                      </button>
                    )}
                    {allowSalesFinance && (
                      <button
                        type="button"
                        disabled={Boolean(project.advancePaid)}
                        onClick={() => setShowAdvanceModal(true)}
                        className="w-full h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold disabled:opacity-45 cursor-pointer text-left transition-colors"
                      >
                        2. Евидентирај уплата на аванс
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-muted/25 border border-border/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">Набавка и магацин</span>
                    <StatusBadge
                      variant={
                        project.supplierOrdered || procurementStatus === 'ORDERED' || procurementStatus === 'DELIVERED'
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {project.supplierOrdered || procurementStatus === 'ORDERED' || procurementStatus === 'DELIVERED'
                        ? 'Нарачана'
                        : 'Не е нарачана'}
                    </StatusBadge>
                  </div>
                  <div className="space-y-2 pt-1">
                    {allowOpsWrite && (
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
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium disabled:opacity-45 cursor-pointer text-left transition-colors"
                      >
                        3. Нарачај кај добавувач
                      </button>
                    )}
                    {allowOpsWrite && (
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
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium disabled:opacity-45 cursor-pointer text-left transition-colors"
                      >
                        4. Прими врата во магацин
                      </button>
                    )}
                    {allowSalesFinance && (
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
                              const offer = project.offerId ? imfexStore.getOfferById(project.offerId) : project.offer;
                              const draftNote = imfexStore.saveDispatchNote({
                                id: `disp-${Date.now()}`,
                                dispatchNumber: imfexStore.generateDispatchNumber(),
                                status: 'DRAFT',
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
                                stockDeducted: false,
                                createdAt: new Date().toISOString(),
                              });
                              const issuedNote = imfexStore.confirmAndIssueDispatchNote(draftNote.id) || draftNote;
                              const freshProj = imfexStore.getProjectById(project.id);
                              if (freshProj) applyProjectData(freshProj);
                              setPreviewDispatch(issuedNote);
                            },
                          });
                        }}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium disabled:opacity-45 cursor-pointer text-left transition-colors"
                      >
                        5. Издај испратница (PDF + залиха)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-lg bg-primary/[0.06] border border-primary/20 text-xs text-foreground">
                <span className="font-semibold text-primary">Состојба: </span>
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
          </SectionCard>

          {/* Card 2.8: Project Financial Summary (Pure TanStack Query Selector — Finance-visible roles only) */}
          {showFinance && (() => {
            const fin = computeProjectFinancialSummary({
              project,
              offers: offersQuery.data ?? imfexStore.getOffers(),
              salesInvoices: salesInvoicesQuery.data ?? imfexStore.getSalesInvoices(),
              purchaseInvoices: purchaseInvoicesQuery.data ?? imfexStore.getPurchaseInvoices(),
              payments: paymentsQuery.data ?? imfexStore.getPayments(),
              products: productsQuery.data ?? imfexStore.getProducts(),
              serviceTickets: imfexStore.getServiceTickets(),
              companySettings: imfexStore.getCompanySettings(),
            });
            return (
              <SectionCard
                title={t('projects.financial_balance')}
                subtitle={t('projects.financial_balance_sub')}
                icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      // BIZ-08: Guard against duplicate FINAL invoices on the same project
                      const existingFinal = (salesInvoicesQuery.data ?? imfexStore.getSalesInvoices()).find(
                        (s) =>
                          s.status !== 'CANCELLED' &&
                          s.invoiceType === 'FINAL' &&
                          (s.projectId === project.id || (project.offerId && s.offerId === project.offerId))
                      );
                      if (existingFinal) {
                        setPreviewInvoice(existingFinal);
                        toast.info(
                          `Веќе постои Конечна Фактура ${existingFinal.invoiceNumber}`,
                          'Отворена е постоечката фактура за да се избегне дуплирање.'
                        );
                        return;
                      }
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
                              ? `Одбиен аванс: -${formatCurrency(finalInv.advanceDeductedAmount)}`
                              : 'Подготвена за печатење.'
                          );
                        },
                      });
                    }}
                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Конечна Фактура</span>
                  </button>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 tabular-nums">
                  <div className="p-3 rounded-lg bg-muted/25 border border-border/80 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {t('projects.fin_sale_gross')}
                    </span>
                    <strong className="text-base font-semibold text-foreground block">
                      {formatCurrency(fin.agreedRevenue)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block">
                      {t('projects.fin_net_short')}: {formatCurrency(fin.netRevenue)} · {t('builder.vat')}: {formatCurrency(fin.vatCollected)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/25 border border-border/80 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {t('projects.fin_paid')}
                    </span>
                    <strong className="text-base font-semibold text-emerald-700 dark:text-emerald-400 block">
                      {formatCurrency(fin.paidByCustomer)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block">
                      {t('projects.fin_debt')}: {formatCurrency(fin.remainingToPay)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/25 border border-border/80 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {t('projects.fin_purchase_cost')}
                    </span>
                    <strong className="text-base font-semibold text-foreground block">
                      {formatCurrency(fin.stockPurchaseCost)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block">
                      {fin.hasActualStockInvoice ? t('projects.fin_actual_invoice') : t('projects.fin_estimated')}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/25 border border-border/80 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      {t('projects.fin_expenses')}
                    </span>
                    <strong className="text-base font-semibold text-amber-700 dark:text-amber-400 block">
                      {formatCurrency(fin.directExpensesCost + fin.serviceCost)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block">
                      {fin.serviceCost > 0
                        ? `${t('projects.fin_direct_short')} + ${t('nav.service')} (${formatCurrency(fin.serviceCost)})`
                        : t('projects.fin_direct_short')}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg border space-y-1 col-span-2 sm:col-span-1 ${
                      fin.isBelowMinMargin || fin.netProfit < 0
                        ? 'bg-red-500/[0.07] border-red-500/25'
                        : fin.hasCostData
                        ? 'bg-emerald-500/[0.07] border-emerald-500/25'
                        : 'bg-muted/25 border-border/80'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-medium block ${
                        fin.isBelowMinMargin || fin.netProfit < 0
                          ? 'text-red-700 dark:text-red-400'
                          : fin.hasCostData
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {fin.hasCostData
                        ? `${t('projects.fin_net_profit')} (${fin.marginPercent}%)`
                        : t('projects.fin_net_profit')}
                    </span>
                    <strong
                      className={`text-base font-semibold block ${
                        fin.isBelowMinMargin || fin.netProfit < 0
                          ? 'text-red-700 dark:text-red-400'
                          : fin.hasCostData
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(fin.netProfit)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground block">
                      {fin.hasCostData ? t('projects.fin_ex_vat_basis') : t('projects.fin_no_cost_recorded')}
                    </span>
                  </div>
                </div>
              </SectionCard>
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
                <DatePicker
                  value={actualDeliveryDate}
                  onChange={(val) => setActualDeliveryDate(val)}
                  ariaLabel={t('projects.actual_delivery')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold text-xs"
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
                  list="project-technicians-datalist"
                  value={installationTeam}
                  onChange={(e) => setInstallationTeam(e.target.value)}
                  placeholder="Избери техничар или внеси тим..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold"
                />
                <datalist id="project-technicians-datalist">
                  {profiles.map((p) => (
                    <option key={p.id} value={p.fullName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-muted-foreground">{t('projects.installation_date')}</label>
                <DatePicker
                  value={installationDate}
                  onChange={(val) => setInstallationDate(val)}
                  ariaLabel={t('projects.installation_date')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none font-bold text-xs text-orange-600"
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" /> {t('projects.handover')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  void generateHandoverProtocolVectorPdf(
                    {
                      ...project,
                      installationTeam,
                      installationDate: installationDate || project.installationDate,
                      installationAddress,
                      installationContact,
                      installationMinutes,
                      signatureUrl: project.signatureUrl,
                    },
                    imfexStore.getCompanySettings(),
                    `Zapisnik-${project.projectNumber}.pdf`
                  ).then(() => toast.success(t('projects.handover_pdf_downloaded'), project.projectNumber));
                }}
                className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>{t('projects.btn_handover_pdf')}</span>
              </button>
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
                {allowOpsWrite && (
                  <button type="button" onClick={clearCanvas} className="text-red-500 font-bold hover:underline cursor-pointer">
                    {t('projects.clear_signature')}
                  </button>
                )}
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

              {allowOpsWrite && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> {t('projects.upload_files')}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={(e) => handleFilesUpload(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Drag & Drop Upload Zone (Operations write roles only) */}
            {allowOpsWrite && (
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
            )}

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
                          ? 'bg-primary text-primary-foreground shadow-sm'
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
                          {att.category === 'IMAGE' && att.dataUrl ? (
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
                              {att.category === 'IMAGE' ? (
                                <ImageIcon className="w-6 h-6" />
                              ) : att.category === 'PDF' ? (
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
                                • {formatDate(att.createdAt)}
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

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title={t('projects.file_download')}
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {allowDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title={t('projects.file_delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Card 6: Internal Project Comments & Activity Timeline (IMP-10) */}
          <SectionCard
            title={t('projects.notes_title')}
            subtitle={t('projects.notes_subtitle')}
            icon={<MessageSquare className="w-4 h-4 text-primary" />}
          >
            <div className="space-y-4">
              {/* Milestone Chips */}
              <div className="flex flex-wrap gap-2">
                {project.createdAt && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border text-[11px] text-muted-foreground tabular-nums">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span>{t('projects.milestone_created')}:</span>
                    <strong className="text-foreground">{formatDate(project.createdAt)}</strong>
                  </span>
                )}
                {project.acceptedAt && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('projects.milestone_accepted')}:</span>
                    <strong>{formatDate(project.acceptedAt)}</strong>
                  </span>
                )}
                {project.supplierOrderedAt && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-primary tabular-nums">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('projects.milestone_ordered')}:</span>
                    <strong>{formatDate(project.supplierOrderedAt)}</strong>
                  </span>
                )}
                {project.warehouseReceivedAt && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 tabular-nums">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('projects.milestone_delivered')}:</span>
                    <strong>{formatDate(project.warehouseReceivedAt)}</strong>
                  </span>
                )}
                {project.dispatchIssuedAt && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('projects.milestone_dispatched')}:</span>
                    <strong>{formatDate(project.dispatchIssuedAt)}</strong>
                  </span>
                )}
              </div>

              {/* Add Internal Note Form (Operations write roles only) */}
              {allowOpsWrite && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const content = newNoteContent.trim();
                  if (!content) return;
                  addNoteMutation.mutate(content, {
                    onSuccess: () => {
                      setNewNoteContent('');
                    },
                  });
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder={t('projects.notes_placeholder')}
                  maxLength={2000}
                  className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/70 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs"
                />
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{addNoteMutation.isPending ? t('projects.notes_adding') : t('projects.notes_add_btn')}</span>
                </button>
              </form>
              )}

              {/* Notes Feed */}
              <div className="space-y-2.5">
                {projectNotesQuery.isPending ? (
                  <div className="py-4 text-center text-muted-foreground text-xs">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
                  </div>
                ) : (projectNotesQuery.data || []).length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                    {t('projects.notes_empty')}
                  </div>
                ) : (
                  (projectNotesQuery.data || []).map((note) => {
                    const canDelete =
                      currentUser?.role === 'SUPER_ADMIN' ||
                      (note.authorId && currentUser?.id === note.authorId);
                    return (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{note.authorName}</span>
                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                              {formatDateTime(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            disabled={deleteNoteMutation.isPending}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                            title={t('projects.notes_delete')}
                            aria-label={t('projects.notes_delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </SectionCard>
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
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
          role="dialog"
          aria-modal="true"
          aria-label={previewAttachment.name}
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
                    {formatDate(previewAttachment.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.dataUrl}
                  download={previewAttachment.name}
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> {t('projects.file_download')}
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  aria-label="Затвори"
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-background/50">
              {previewAttachment.category === 'IMAGE' && previewBlobUrl ? (
                <img
                  src={previewBlobUrl}
                  alt={previewAttachment.name}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg"
                />
              ) : previewAttachment.category === 'PDF' && previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
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
                    rel="noopener noreferrer"
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
