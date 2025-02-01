"use client";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { ArrowLeft, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface EmployeeFunction {
  name: string;
  cost: number;
}

interface BudgetEmployee {
  amount: number;
  dedication: number;
  amount_type: number;
  employee_id: number;
  profit_margin: number;
  employee_function: EmployeeFunction;
}

interface Budget {
  id: number;
  pipedrive_code: number;
  customer_name: string;
  total: string;
  commission: string;
  tax: string;
  cost: string;
  budget_employee: BudgetEmployee[];
}

const AMOUNT_TYPES = {
  HOUR: 0,
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
};

export default function BudgetViewPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPV, setUserPV] = useState<number>(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth) {
      const { pv } = JSON.parse(auth);
      setUserPV(Number(pv));
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchBudget(params.id as string);
    }
  }, [params.id]);

  const fetchBudget = async (id: string) => {
    try {
      const response = await api.get<Budget[]>(`/budget/view?id=${id}`);
      if (response.data && response.data.length > 0) {
        setBudget(response.data[0]);
      } else {
        setBudget(null);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar o orçamento",
      });
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  };

  const formatPercentage = (value: string | number) => {
    return `${(Number(value) * 100).toFixed(1)}%`;
  };

  const calculateEmployeeCost = (emp: BudgetEmployee) => {
    const baseCost = emp.employee_function.cost;
    let adjustedCost = baseCost;

    switch (emp.amount_type) {
      case AMOUNT_TYPES.HOUR:
        adjustedCost = baseCost / 160; // Custo mensal dividido por 160 horas
        break;
      case AMOUNT_TYPES.DAY:
        adjustedCost = baseCost / 30; // Custo mensal dividido por 30 dias
        break;
      case AMOUNT_TYPES.WEEK:
        adjustedCost = baseCost / 4; // Custo mensal dividido por 4 semanas
        break;
    }

    return adjustedCost * emp.amount * emp.dedication;
  };

  const calculateEmployeeTotal = (emp: BudgetEmployee) => {
    const cost = calculateEmployeeCost(emp);
    return cost * (1 + emp.profit_margin);
  };

  const calculateNetProfit = (budget: Budget) => {
    const totalValue = Number(budget.total);
    const totalCost = Number(budget.cost);
    const commissionValue = totalValue * Number(budget.commission);
    const taxValue = totalValue * Number(budget.tax);

    return totalValue - totalCost - commissionValue - taxValue;
  };

  const handleDeleteBudget = async () => {
    try {
      await api.delete(`/budget/view?id=${budget?.id}`);
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso",
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o orçamento",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const downloadPDF = async () => {
    if (!budget) return;

    try {
      const response = await api.post(
        "/generate/pdf",
        {
          html: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; }
                .logo { text-align: center; margin-bottom: 30px; }
                .logo img { max-width: 200px; height: auto; }
                .header { margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .info { margin-bottom: 20px; }
                .info-item { margin-bottom: 10px; }
                .label { color: #666; font-size: 14px; }
                .value { font-size: 16px; font-weight: 500; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; }
                .text-right { text-align: right; }
                .summary { background-color: #f5f5f5; padding: 20px; border-radius: 8px; }
                .red { color: #dc2626; }
                .green { color: #059669; }
                .indigo { color: #4f46e5; }
              </style>
            </head>
            <body>
              <div class="logo">
                <img src="https://vendas.hybriun.com.br/logo.png" alt="Hybriun Logo" />
              </div>
              <div class="header">
                <div class="title">Detalhes do Orçamento</div>
                <div class="info">
                  <div class="info-item">
                    <div class="label">Código Pipedrive</div>
                    <div class="value">${budget.pipedrive_code}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Cliente</div>
                    <div class="value">${budget.customer_name}</div>
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Cargo</th>
                    <th class="text-right">Custo Base</th>
                    <th class="text-right">Quantidade</th>
                    <th class="text-right">Tipo</th>
                    <th class="text-right">Dedicação</th>
                    <th class="text-right">Margem</th>
                    <th class="text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${budget.budget_employee
                    .map(
                      (emp) => `
                    <tr>
                      <td>${emp.employee_function.name}</td>
                      <td class="text-right">${formatCurrency(
                        emp.employee_function.cost
                      )}</td>
                      <td class="text-right">${emp.amount}</td>
                      <td class="text-right">${
                        emp.amount_type === AMOUNT_TYPES.HOUR
                          ? "Horas"
                          : emp.amount_type === AMOUNT_TYPES.DAY
                          ? "Dias"
                          : emp.amount_type === AMOUNT_TYPES.WEEK
                          ? "Semanas"
                          : "Meses"
                      }</td>
                      <td class="text-right">${formatPercentage(
                        emp.dedication
                      )}</td>
                      <td class="text-right">${formatPercentage(
                        emp.profit_margin
                      )}</td>
                      <td class="text-right">${formatCurrency(
                        calculateEmployeeTotal(emp)
                      )}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>

              <div class="summary">
                <h3 style="margin-top: 0;">Resumo Financeiro</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <div class="label">Valor Total Bruto</div>
                    <div class="value">${formatCurrency(budget.total)}</div>
                  </div>
                  <div>
                    <div class="label">Comissão (${formatPercentage(
                      budget.commission
                    )})</div>
                    <div class="value red">-${formatCurrency(
                      Number(budget.total) * Number(budget.commission)
                    )}</div>
                  </div>
                  <div>
                    <div class="label">Impostos (${formatPercentage(
                      budget.tax
                    )})</div>
                    <div class="value red">-${formatCurrency(
                      Number(budget.total) * Number(budget.tax)
                    )}</div>
                  </div>
                  <div>
                    <div class="label">Custo Total Base</div>
                    <div class="value red">-${formatCurrency(budget.cost)}</div>
                  </div>
                  <div>
                    <div class="label">Margem de Lucro Total</div>
                    <div class="value ${
                      calculateNetProfit(budget) >= 0 ? "green" : "red"
                    }">${formatCurrency(calculateNetProfit(budget))}</div>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        },
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orcamento-${budget.pipedrive_code}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF",
      });
    }
  };

  const downloadSimplifiedPDF = async () => {
    if (!budget) return;

    try {
      const response = await api.post(
        "/generate/pdf",
        {
          html: `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; }
                .logo { text-align: center; margin-bottom: 30px; }
                .logo img { max-width: 200px; height: auto; }
                .header { margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .info { margin-bottom: 20px; }
                .info-item { margin-bottom: 10px; }
                .label { color: #666; font-size: 14px; }
                .value { font-size: 16px; font-weight: 500; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; }
                .text-right { text-align: right; }
                .summary { background-color: #f5f5f5; padding: 20px; border-radius: 8px; }
                .red { color: #dc2626; }
                .indigo { color: #4f46e5; }
              </style>
            </head>
            <body>
              <div class="logo">
                <img src="https://vendas.hybriun.com.br/logo.png" alt="Hybriun Logo" />
              </div>
              <div class="header">
                <div class="title">Orçamento</div>
                <div class="info">
                  <div class="info-item">
                    <div class="label">Código Pipedrive</div>
                    <div class="value">${budget.pipedrive_code}</div>
                  </div>
                  <div class="info-item">
                    <div class="label">Cliente</div>
                    <div class="value">${budget.customer_name}</div>
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Cargo</th>
                    <th class="text-right">Quantidade</th>
                    <th class="text-right">Tipo</th>
                    <th class="text-right">Dedicação</th>
                  </tr>
                </thead>
                <tbody>
                  ${budget.budget_employee
                    .map(
                      (emp) => `
                    <tr>
                      <td>${emp.employee_function.name}</td>
                      <td class="text-right">${emp.amount}</td>
                      <td class="text-right">${
                        emp.amount_type === AMOUNT_TYPES.HOUR
                          ? "Horas"
                          : emp.amount_type === AMOUNT_TYPES.DAY
                          ? "Dias"
                          : emp.amount_type === AMOUNT_TYPES.WEEK
                          ? "Semanas"
                          : "Meses"
                      }</td>
                      <td class="text-right">${formatPercentage(
                        emp.dedication
                      )}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>

              <div class="summary">
                <h3 style="margin-top: 0;">Resumo Financeiro</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <div class="label">Valor Total</div>
                    <div class="value indigo">${formatCurrency(
                      budget.total
                    )}</div>
                  </div>
                  <div>
                    <div class="label">Comissão (${formatPercentage(
                      budget.commission
                    )})</div>
                    <div class="value red">-${formatCurrency(
                      Number(budget.total) * Number(budget.commission)
                    )}</div>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        },
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orcamento-simplificado-${budget.pipedrive_code}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Orçamento não encontrado
              </h2>
              <p className="text-muted-foreground mb-6">
                O orçamento que você está procurando não existe ou foi removido.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Detalhes do Orçamento
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={downloadSimplifiedPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Gerar PDF
              </Button>
              {userPV === 9 && (
                <Button
                  onClick={downloadPDF}
                  className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Gerar PDF completo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Código Pipedrive
                  </div>
                  <div className="text-lg font-medium">
                    {budget.pipedrive_code}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cliente</div>
                  <div className="text-lg font-medium">
                    {budget.customer_name}
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cargo</TableHead>
                      {userPV === 9 && (
                        <TableHead className="text-right">Custo Base</TableHead>
                      )}
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Tipo</TableHead>
                      <TableHead className="text-right">Dedicação</TableHead>
                      {userPV === 9 && (
                        <TableHead className="text-right">Margem</TableHead>
                      )}
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budget.budget_employee.map((emp, index) => (
                      <TableRow key={index}>
                        <TableCell>{emp.employee_function.name}</TableCell>
                        {userPV === 9 && (
                          <TableCell className="text-right">
                            {formatCurrency(emp.employee_function.cost)}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          {emp.amount}
                        </TableCell>
                        <TableCell className="text-right">
                          {emp.amount_type === AMOUNT_TYPES.HOUR && "Horas"}
                          {emp.amount_type === AMOUNT_TYPES.DAY && "Dias"}
                          {emp.amount_type === AMOUNT_TYPES.WEEK && "Semanas"}
                          {emp.amount_type === AMOUNT_TYPES.MONTH && "Meses"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercentage(emp.dedication)}
                        </TableCell>
                        {userPV === 9 && (
                          <TableCell className="text-right">
                            {formatPercentage(emp.profit_margin)}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {formatCurrency(calculateEmployeeTotal(emp))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {userPV === 9 && (
                <Card className="bg-primary/5 border-2 border-primary/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-6">
                        Margem de Lucro Total
                      </h3>
                      <div
                        className={`text-4xl font-bold ${
                          calculateNetProfit(budget) >= 0
                            ? "text-green-500 dark:text-green-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {formatCurrency(calculateNetProfit(budget))}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {calculateNetProfit(budget) >= 0
                          ? "Lucro Líquido"
                          : "Prejuízo"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">
                  Detalhamento Financeiro
                </h3>
                {userPV === 9 ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Valor Total Bruto
                      </div>
                      <div className="text-lg font-medium">
                        {formatCurrency(budget.total)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Comissão ({formatPercentage(budget.commission)})
                      </div>
                      <div className="text-lg font-medium text-red-500 dark:text-red-400">
                        -
                        {formatCurrency(
                          Number(budget.total) * Number(budget.commission)
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Impostos ({formatPercentage(budget.tax)})
                      </div>
                      <div className="text-lg font-medium text-red-500 dark:text-red-400">
                        -
                        {formatCurrency(
                          Number(budget.total) * Number(budget.tax)
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Custo Total Base
                      </div>
                      <div className="text-lg font-medium text-red-500 dark:text-red-400">
                        -{formatCurrency(budget.cost)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-4">
                    <div>
                      <div className="text-sm text-muted-foreground text-center mb-2">
                        Valor Total da Proposta
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(budget.total)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {userPV === 9 && (
                <div className="flex justify-end pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-500 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10 border-red-200 dark:border-red-400/20 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Orçamento
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o orçamento {budget?.id} -{" "}
              {budget?.customer_name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBudget}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
