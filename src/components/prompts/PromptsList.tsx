import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/contexts/CustomAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Trash2, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PromptsForm } from "./PromptsForm";
import Swal from "sweetalert2";

export function PromptsList() {
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const { user } = useCustomAuth();
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["prompts", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prompt berjaya dipadam!");
      queryClient.invalidateQueries({ queryKey: ["prompts", user?.id] });
    },
    onError: (error: any) => {
      // Check if error is due to foreign key constraint (prompt being used in campaigns)
      if (error.message && error.message.includes('foreign key constraint')) {
        toast.error("Prompt ini tidak boleh dipadam kerana sedang digunakan dalam kempen yang telah dibuat sebelum ini.");
      } else {
        toast.error("Gagal memadam prompt: " + error.message);
      }
    },
  });

  const handleEdit = (prompt: any) => {
    setSelectedPrompt(prompt);
    setShowForm(true);
  };

  const handleDelete = async (prompt: any) => {
    const result = await Swal.fire({
      title: 'Adakah anda pasti?',
      text: `Memadam prompt "${prompt.prompt_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, padam!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      deleteMutation.mutate(prompt.id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedPrompt(null);
  };

  if (showForm) {
    return (
      <PromptsForm
        prompt={selectedPrompt}
        onClose={handleCloseForm}
        onSuccess={handleCloseForm}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="text-lg sm:text-xl">Senarai Prompt Skrip</CardTitle>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Cipta Prompt Baru
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p>Memuat senarai prompt...</p>
          </div>
        ) : !prompts || prompts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4 text-sm sm:text-base">
              Tiada prompt dijumpai. Cipta prompt pertama anda untuk memulakan kempen panggilan.
            </p>
            <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Cipta Prompt Pertama
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Prompt</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Mesej Pertama</TableHead>
                    <TableHead>Tarikh Dicipta</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell className="font-medium">
                        {prompt.prompt_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 0 ? (
                            prompt.variables.slice(0, 2).map((variable: any, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {`{{${variable.name}}}`}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Tiada variables</span>
                          )}
                          {prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{prompt.variables.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {prompt.first_message}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {new Date(prompt.created_at).toLocaleDateString('ms-MY')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(prompt)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(prompt)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-2">
                      <h3 className="font-semibold text-sm">{prompt.prompt_name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {prompt.first_message}
                      </p>
                      {prompt.variables && Array.isArray(prompt.variables) && prompt.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {prompt.variables.slice(0, 3).map((variable: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {`{{${variable.name}}}`}
                            </Badge>
                          ))}
                          {prompt.variables.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{prompt.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(prompt)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(prompt)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Created:</span>
                    <Badge variant="outline" className="text-xs">
                      {new Date(prompt.created_at).toLocaleDateString('ms-MY')}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}