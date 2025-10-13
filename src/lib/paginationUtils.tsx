import { PaginationItem, PaginationLink } from "@/components/ui/pagination";

interface PaginationPagesProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function renderPaginationPages({ currentPage, totalPages, onPageChange }: PaginationPagesProps) {
  const pages = [];
  
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
  } else {
    // Always show first page
    pages.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(1);
          }}
          isActive={currentPage === 1}
          className="cursor-pointer"
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Show ellipsis if current page > 3
    if (currentPage > 3) {
      pages.push(
        <PaginationItem key="ellipsis-1">
          <span className="flex h-9 w-9 items-center justify-center text-sm">...</span>
        </PaginationItem>
      );
    }
    
    // Show pages around current page
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Show ellipsis if current page < totalPages - 2
    if (currentPage < totalPages - 2) {
      pages.push(
        <PaginationItem key="ellipsis-2">
          <span className="flex h-9 w-9 items-center justify-center text-sm">...</span>
        </PaginationItem>
      );
    }
    
    // Always show last page
    pages.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onPageChange(totalPages);
          }}
          isActive={currentPage === totalPages}
          className="cursor-pointer"
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>
    );
  }
  
  return pages;
}
