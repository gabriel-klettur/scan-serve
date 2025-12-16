import { FileImage, Files } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useUploadSettingsStore } from '@/store/uploadSettingsStore';
import { ImageUploader } from './ImageUploader';
import { MultipleImageUploader } from './MultipleImageUploader';

/**
 * Tab selector component for switching between Single and Multiple upload modes.
 * Single mode: uploads one file at a time with engine selection dialog.
 * Multiple mode: queue multiple files with preset engine and AI enhancement settings.
 */
export const UploadModeSelector = () => {
  const { mode, setMode } = useUploadSettingsStore();

  return (
    <Tabs
      value={mode}
      onValueChange={(value) => setMode(value as 'single' | 'multiple')}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger
          value="single"
          className={cn(
            'gap-2 data-[state=active]:shadow-glow',
            'data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10'
          )}
        >
          <FileImage className="w-4 h-4" />
          Single
        </TabsTrigger>
        <TabsTrigger
          value="multiple"
          className={cn(
            'gap-2 data-[state=active]:shadow-glow',
            'data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10'
          )}
        >
          <Files className="w-4 h-4" />
          Multiple
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="mt-0">
        <ImageUploader />
      </TabsContent>

      <TabsContent value="multiple" className="mt-0">
        <MultipleImageUploader />
      </TabsContent>
    </Tabs>
  );
};
