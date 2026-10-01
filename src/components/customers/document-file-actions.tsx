import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentFileActionsProps {
  documentId: string;
  hasFile: boolean;
}

export function DocumentFileActions({ documentId, hasFile }: DocumentFileActionsProps) {
  if (!hasFile) {
    return <span className="text-muted-foreground">-</span>;
  }

  const fileUrl = `/api/customer-documents/${documentId}/file`;
  const downloadUrl = `${fileUrl}?download=1`;

  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="outline" size="sm" asChild>
        <Link href={fileUrl} target="_blank" rel="noopener noreferrer">
          <Eye className="mr-1 h-4 w-4" />
          View
        </Link>
      </Button>
      <Button variant="secondary" size="sm" asChild>
        <a href={downloadUrl} download>
          <Download className="mr-1 h-4 w-4" />
          Download
        </a>
      </Button>
    </div>
  );
}
