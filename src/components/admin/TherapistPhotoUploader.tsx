import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/api/types';
import { auth } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface TherapistPhotoUploaderProps {
  therapistId: string;
  therapistName: string;
  currentPhotoUrl: string | null;
}

export function TherapistPhotoUploader({
  therapistId,
  therapistName,
  currentPhotoUrl,
}: TherapistPhotoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const initials = therapistName.split(' ').map(n => n[0]).join('').slice(0, 2);

  type TherapistPhoto = { id: string; photo_type: string; photo_url: string };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const baseUrl = API_BASE_URL;
      const token = auth.getToken();

      // Upload photo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('therapist_id', therapistId);
      formData.append('photo_type', 'profile');

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

      // Create or update therapist photo record
      const photosResponse = await fetch(`${baseUrl}/therapists/${therapistId}/photos`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        const existingPhoto = (photosData?.data as TherapistPhoto[] | undefined)?.find((p) => p.photo_type === 'profile');

        if (existingPhoto) {
          // Update existing photo
          await fetch(`${baseUrl}/therapist-photos/${existingPhoto.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photo_url: photoUrl, is_active: true })
          });
        } else {
          // Create new photo
          await fetch(`${baseUrl}/therapists/${therapistId}/photos`, {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              photo_url: photoUrl,
              photo_type: 'profile',
              is_active: true
            })
          });
        }
      }

      return photoUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-therapists'] });
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      toast.success('Foto actualizada correctamente');
      handleClose();
    },
    onError: (error) => {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto');
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
        <Button variant="ghost" size="icon" className="relative group">
          <Avatar className="h-12 w-12">
            <AvatarImage src={(() => {
              if (!currentPhotoUrl) return undefined;
              return currentPhotoUrl.startsWith('http') ? currentPhotoUrl : `${API_BASE_URL}/uploads/${currentPhotoUrl.replace(/^uploads\//, '')}`;
            })()} alt={therapistName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar foto de perfil</DialogTitle>
          <DialogDescription>
            Subir una nueva foto para {therapistName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar className="h-32 w-32">
              <AvatarImage
                src={preview || (() => {
                  if (!currentPhotoUrl) return undefined;
                  return currentPhotoUrl.startsWith('http') ? currentPhotoUrl : `${API_BASE_URL}/uploads/${currentPhotoUrl.replace(/^uploads\//, '')}`;
                })()}
                alt={therapistName}
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={triggerFileInput}
              disabled={uploadMutation.isPending}
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
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Formatos permitidos: JPG, PNG, WebP. Máximo 5MB.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
