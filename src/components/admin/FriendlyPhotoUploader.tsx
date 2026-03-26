import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Loader2, Trash2, ImageIcon } from 'lucide-react';
import { API_BASE_URL } from '@/api/types';
import { apiClient, auth } from '@/integrations/api/client';
import type { TherapistUpdate } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface FriendlyPhotoUploaderProps {
  therapistId: string;
  therapistName: string;
  currentFriendlyPhotoUrl: string | null;
}

export function FriendlyPhotoUploader({
  therapistId,
  therapistName,
  currentFriendlyPhotoUrl,
}: FriendlyPhotoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const initials = therapistName.split(' ').map(n => n[0]).join('').slice(0, 2);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const baseUrl = API_BASE_URL;
      const token = auth.getToken();

      // Upload photo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('therapist_id', therapistId);
      formData.append('photo_type', 'friendly');

      const uploadResponse = await fetch(`${baseUrl}/upload/therapist-photo`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir la foto');
      }

      const uploadData = await uploadResponse.json();
      const photoUrl = uploadData?.data?.url;

      if (!photoUrl) {
        throw new Error('No se recibió la URL de la foto');
      }

      // Update therapist friendly_photo_url
      await apiClient.updatetherapist(therapistId, { friendly_photo_url: photoUrl } as TherapistUpdate);

      return photoUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-about-team'] });
      queryClient.invalidateQueries({ queryKey: ['about-team-members'] });
      toast.success('Foto institucional actualizada correctamente');
      handleClose();
    },
    onError: (error) => {
      console.error('Error uploading friendly photo:', error);
      toast.error('Error al subir la foto institucional');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Set friendly_photo_url to null - does NOT affect photo_url
      await apiClient.updatetherapist(therapistId, { friendly_photo_url: null } as TherapistUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-about-team'] });
      queryClient.invalidateQueries({ queryKey: ['about-team-members'] });
      toast.success('Foto institucional eliminada');
      handleClose();
    },
    onError: (error) => {
      console.error('Error deleting friendly photo:', error);
      toast.error('Error al eliminar la foto institucional');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten archivos de imagen');
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setSelectedFile(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImageIcon className="h-4 w-4" />
          {currentFriendlyPhotoUrl ? 'Cambiar' : 'Subir'} foto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foto institucional (Conócenos)</DialogTitle>
          <DialogDescription>
            Esta imagen solo se muestra en la página "Conócenos" y NO afecta la foto de agenda/tarjetas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar className="h-32 w-32 ring-4 ring-primary/20">
              <AvatarImage
                src={preview || (() => {
                  if (!currentFriendlyPhotoUrl) return undefined;
                  return currentFriendlyPhotoUrl.startsWith('http') ? currentFriendlyPhotoUrl : `${API_BASE_URL}/uploads/${currentFriendlyPhotoUrl.replace(/^uploads\//, '')}`;
                })()}
                alt={therapistName}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {preview && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => {
                  setPreview(null);
                  setSelectedFile(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <p className="text-sm font-medium">{therapistName}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              onClick={triggerFileInput}
              disabled={uploadMutation.isPending || deleteMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Seleccionar imagen
            </Button>

            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            )}

            {currentFriendlyPhotoUrl && !selectedFile && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar foto institucional?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará la foto de la página "Conócenos".
                      La foto de agenda/tarjetas NO será afectada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Eliminar'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Formatos permitidos: JPG, PNG, WebP. Máximo 5MB.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
