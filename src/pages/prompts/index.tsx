import { PromptsList } from '@/components/prompts/PromptsList';

export default function PromptsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-7xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pengurusan Skrip Prompt</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Cipta dan urus templat skrip untuk kempen panggilan AI anda
            </p>
          </div>

          <PromptsList />
        </div>
      </main>
    </div>
  );
}