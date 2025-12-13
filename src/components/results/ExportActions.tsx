import { motion } from 'framer-motion';
import { Download, RefreshCw, FileJson, Scan } from 'lucide-react';
import { useOCRStore } from '@/store/ocrStore';
import { downloadAsJson } from '@/utils/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const ExportActions = () => {
  const { result, reset } = useOCRStore();

  if (!result) return null;

  const handleExportJson = () => {
    downloadAsJson(result, `ocr-result-${Date.now()}.json`);
    toast.success('JSON file downloaded');
  };

  const handleNewScan = () => {
    reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col gap-3"
    >
      <Button onClick={handleExportJson} className="w-full gap-2">
        <FileJson className="w-4 h-4" />
        Export as JSON
      </Button>
      <Button variant="outline" onClick={handleNewScan} className="w-full gap-2">
        <RefreshCw className="w-4 h-4" />
        New Scan
      </Button>
    </motion.div>
  );
};
