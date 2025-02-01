"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, LogOut, DollarSign, Plus, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Budget {
  id: number;
  pipedrive_code: number;
  customer_name: string;
  total: string;
  commission: string;
  tax: string;
  cost: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPV, setUserPV] = useState<number>(0);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      router.push("/");
      return;
    }
    const { pv } = JSON.parse(auth);
    setUserPV(Number(pv));
    fetchBudgets();
  };

  const fetchBudgets = async () => {
    try {
      const response = await api.get<Budget[]>("/budget");
      setBudgets(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os orçamentos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth");
    router.push("/");
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  const formatPercentage = (value: string) => {
    return `${(Number(value) * 100).toFixed(1)}%`;
  };

  const calculateCommissionValue = (budget: Budget) => {
    return Number(budget.total) * Number(budget.commission);
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;

    try {
      await api.delete(`/budget/view?id=${deletingBudget.id}`);
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso",
      });
      fetchBudgets();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o orçamento",
      });
    } finally {
      setDeletingBudget(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/dashboard/new")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Últimos Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : budgets.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Código Pipedrive</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      {userPV === 9 && (
                        <>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">Imposto</TableHead>
                        </>
                      )}
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell>{budget.id}</TableCell>
                        <TableCell className="font-medium">
                          {budget.pipedrive_code}
                        </TableCell>
                        <TableCell>{budget.customer_name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(budget.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>{formatPercentage(budget.commission)}</div>
                          <div className="text-sm text-red-600">
                            ({formatCurrency(calculateCommissionValue(budget))})
                          </div>
                        </TableCell>
                        {userPV === 9 && (
                          <>
                            <TableCell className="text-right">
                              {formatCurrency(budget.cost)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-indigo-600">
                              {formatCurrency(Number(budget.total) - Number(budget.cost))}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(budget.tax)}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/dashboard/view/${budget.id}`)}
                              className="text-gray-500 hover:text-indigo-600"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {userPV === 9 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingBudget(budget)}
                                className="text-gray-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum orçamento encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingBudget} onOpenChange={() => setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o orçamento {deletingBudget?.id} - {deletingBudget?.customer_name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}