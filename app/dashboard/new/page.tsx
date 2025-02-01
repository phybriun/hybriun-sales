"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowLeft, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Employee {
  id: number;
  name: string;
  cost: string;
}

interface EmployeeEntry {
  employee_id: number;
  amount: number;
  amount_type: number;
  dedication: number;
  profit_margin: number;
}

interface BudgetFormData {
  pipedrive_code: number;
  customer_name: string;
  total: number;
  commission: number;
  tax: number;
  cost: number;
  budget_employee: EmployeeEntry[];
}

const DEFAULT_TAX = 0.19; // 19%
const DEFAULT_PROFIT_MARGIN = 1; // 100%

const AMOUNT_TYPES = {
  HOUR: 0,
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
};

export default function NewBudget() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userPV, setUserPV] = useState<number>(0);
  const [userCommission, setUserCommission] = useState<number>(0);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeEntry>({
    employee_id: 0,
    amount: 0,
    amount_type: AMOUNT_TYPES.MONTH,
    dedication: 1,
    profit_margin: DEFAULT_PROFIT_MARGIN,
  });
  const [formData, setFormData] = useState<BudgetFormData>({
    pipedrive_code: 0,
    customer_name: "",
    total: 0,
    commission: 0,
    tax: DEFAULT_TAX,
    cost: 0,
    budget_employee: [],
  });

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth) {
      const { pv, commission } = JSON.parse(auth);
      setUserPV(Number(pv));
      setUserCommission(Number(commission));
      setFormData((prev) => ({
        ...prev,
        commission: Number(commission),
      }));
    }
    fetchEmployees();
  }, []);

  useEffect(() => {
    const total = calculateTotalBudget();
    const cost = calculateTotalCost();
    setFormData((prev) => ({
      ...prev,
      total,
      cost,
    }));
  }, [formData.budget_employee]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get<Employee[]>("/employee");
      setEmployees(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a lista de funcionários",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    if (name === "pipedrive_code") {
      parsedValue = value === "" ? 0 : Number(value);
    } else if (["commission", "tax"].includes(name)) {
      parsedValue = value === "" ? 0 : Number(value) / 100;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleEmployeeInputChange = (
    field: keyof EmployeeEntry,
    value: string
  ) => {
    let parsedValue: number = value === "" ? 0 : Number(value);

    if (field === "profit_margin" || field === "dedication") {
      parsedValue = parsedValue / 100;
    }

    setCurrentEmployee((prev) => ({
      ...prev,
      [field]: parsedValue,
    }));
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setCurrentEmployee((prev) => ({
      ...prev,
      employee_id: Number(employeeId),
    }));
  };

  const addEmployee = () => {
    if (currentEmployee.employee_id === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um cargo",
      });
      return;
    }

    if (currentEmployee.amount === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe a quantidade",
      });
      return;
    }

    // For non-PV 9 users, always set profit_margin to 100%
    const employeeToAdd = {
      ...currentEmployee,
      profit_margin:
        userPV === 9 ? currentEmployee.profit_margin : DEFAULT_PROFIT_MARGIN,
    };

    setFormData((prev) => ({
      ...prev,
      budget_employee: [...prev.budget_employee, employeeToAdd],
    }));

    setCurrentEmployee({
      employee_id: 0,
      amount: 0,
      amount_type: AMOUNT_TYPES.MONTH,
      dedication: 1,
      profit_margin: DEFAULT_PROFIT_MARGIN,
    });
  };

  const removeEmployee = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      budget_employee: prev.budget_employee.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.budget_employee.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Adicione pelo menos um funcionário",
      });
      return;
    }

    setIsLoading(true);

    try {
      // For non-PV 9 users, ensure commission and tax are set to default values
      const submissionData = {
        ...formData,
        commission: userPV === 9 ? formData.commission : userCommission,
        tax: userPV === 9 ? formData.tax : DEFAULT_TAX,
      };

      await api.post("/budget", submissionData);
      toast({
        title: "Sucesso!",
        description: "Orçamento criado com sucesso.",
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar o orçamento.",
      });
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

  const getEmployeeName = (id: number) => {
    return employees.find((emp) => emp.id === id)?.name || "";
  };

  const getEmployeeCost = (id: number) => {
    return employees.find((emp) => emp.id === id)?.cost || "0";
  };

  const calculateEmployeeCost = (emp: EmployeeEntry) => {
    const baseCost = Number(getEmployeeCost(emp.employee_id));
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

  const calculateEmployeeTotal = (emp: EmployeeEntry) => {
    const cost = calculateEmployeeCost(emp);
    return cost * (1 + emp.profit_margin);
  };

  const calculateTotalBudget = () => {
    return formData.budget_employee.reduce((total, emp) => {
      return total + calculateEmployeeTotal(emp);
    }, 0);
  };

  const calculateTotalCost = () => {
    return formData.budget_employee.reduce((total, emp) => {
      return total + calculateEmployeeCost(emp);
    }, 0);
  };

  const calculateNetProfit = () => {
    const totalValue = formData.total;
    const totalCost = formData.cost;
    const commissionValue = totalValue * formData.commission;
    const taxValue = totalValue * formData.tax;

    return totalValue - totalCost - commissionValue - taxValue;
  };

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Novo Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pipedrive_code">Código Pipedrive</Label>
                  <Input
                    id="pipedrive_code"
                    name="pipedrive_code"
                    type="number"
                    required
                    value={formData.pipedrive_code || ""}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nome do Cliente</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    required
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total">Valor Total</Label>
                  <Input
                    id="total"
                    name="total"
                    type="number"
                    step="0.01"
                    required
                    value={formData.total || ""}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>
                {userPV === 9 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="commission">Comissão (%)</Label>
                      <Input
                        id="commission"
                        name="commission"
                        type="number"
                        step="0.1"
                        required
                        value={
                          formData.commission ? formData.commission * 100 : ""
                        }
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax">Imposto (%)</Label>
                      <Input
                        id="tax"
                        name="tax"
                        type="number"
                        step="0.1"
                        required
                        value={formData.tax ? formData.tax * 100 : ""}
                        onChange={handleInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <Label>Adicionar Funcionário</Label>
                <div className="grid grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select
                      value={currentEmployee.employee_id.toString()}
                      onValueChange={handleEmployeeSelect}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            <span className="flex items-center justify-between w-full">
                              <span>{emp.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(emp.cost)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      value={currentEmployee.amount || ""}
                      onChange={(e) =>
                        handleEmployeeInputChange("amount", e.target.value)
                      }
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={currentEmployee.amount_type.toString()}
                      onValueChange={(value) =>
                        setCurrentEmployee((prev) => ({
                          ...prev,
                          amount_type: Number(value),
                        }))
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AMOUNT_TYPES.HOUR.toString()}>
                          Horas
                        </SelectItem>
                        <SelectItem value={AMOUNT_TYPES.DAY.toString()}>
                          Dias
                        </SelectItem>
                        <SelectItem value={AMOUNT_TYPES.WEEK.toString()}>
                          Semanas
                        </SelectItem>
                        <SelectItem value={AMOUNT_TYPES.MONTH.toString()}>
                          Meses
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dedicação (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentEmployee.dedication * 100}
                      onChange={(e) =>
                        handleEmployeeInputChange(
                          "dedication",
                          (Number(e.target.value) / 100).toString()
                        )
                      }
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    {userPV === 9 ? (
                      <>
                        <Label>Margem (%)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            value={
                              currentEmployee.profit_margin
                                ? currentEmployee.profit_margin * 100
                                : ""
                            }
                            onChange={(e) =>
                              handleEmployeeInputChange(
                                "profit_margin",
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            onClick={addEmployee}
                            className="bg-primary hover:bg-primary/90"
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-end h-full">
                        <Button
                          type="button"
                          onClick={addEmployee}
                          className="bg-primary hover:bg-primary/90 w-full"
                          disabled={isLoading}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {formData.budget_employee.length > 0 && (
                  <>
                    <div className="mt-6">
                      <Label className="mb-4 block">
                        Funcionários Adicionados
                      </Label>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cargo</TableHead>
                              <TableHead className="text-right">
                                Custo Base
                              </TableHead>
                              <TableHead className="text-right">
                                Quantidade
                              </TableHead>
                              <TableHead className="text-right">Tipo</TableHead>
                              <TableHead className="text-right">
                                Dedicação
                              </TableHead>
                              {userPV === 9 && (
                                <TableHead className="text-right">
                                  Margem
                                </TableHead>
                              )}
                              <TableHead className="text-right">
                                Valor Total
                              </TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formData.budget_employee.map((emp, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {getEmployeeName(emp.employee_id)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    getEmployeeCost(emp.employee_id)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {emp.amount}
                                </TableCell>
                                <TableCell className="text-right">
                                  {emp.amount_type === AMOUNT_TYPES.HOUR &&
                                    "Horas"}
                                  {emp.amount_type === AMOUNT_TYPES.DAY &&
                                    "Dias"}
                                  {emp.amount_type === AMOUNT_TYPES.WEEK &&
                                    "Semanas"}
                                  {emp.amount_type === AMOUNT_TYPES.MONTH &&
                                    "Meses"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(emp.dedication * 100).toFixed(1)}%
                                </TableCell>
                                {userPV === 9 && (
                                  <TableCell className="text-right">
                                    {(emp.profit_margin * 100).toFixed(1)}%
                                  </TableCell>
                                )}
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(calculateEmployeeTotal(emp))}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeEmployee(index)}
                                    className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {userPV === 9 && (
                      <Card className="bg-primary/5 border-2 border-primary/20 mb-6">
                        <CardContent className="p-6">
                          <div className="text-center">
                            <h3 className="text-xl font-semibold mb-6">
                              Margem de Lucro Total
                            </h3>
                            <div
                              className={`text-4xl font-bold ${
                                calculateNetProfit() >= 0
                                  ? "text-green-500 dark:text-green-400"
                                  : "text-red-500 dark:text-red-400"
                              }`}
                            >
                              {formatCurrency(calculateNetProfit())}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {calculateNetProfit() >= 0
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Valor Total Bruto
                          </p>
                          <p className="text-lg font-medium">
                            {formatCurrency(formData.total)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Comissão ({(formData.commission * 100).toFixed(1)}%)
                          </p>
                          <p className="text-lg font-medium text-red-500 dark:text-red-400">
                            -
                            {formatCurrency(
                              formData.total * formData.commission
                            )}
                          </p>
                        </div>
                        {userPV === 9 && (
                          <>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Impostos ({(formData.tax * 100).toFixed(1)}%)
                              </p>
                              <p className="text-lg font-medium text-red-500 dark:text-red-400">
                                -{formatCurrency(formData.total * formData.tax)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Custo Total Base
                              </p>
                              <p className="text-lg font-medium text-red-500 dark:text-red-400">
                                -{formatCurrency(formData.cost)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Salvando..." : "Salvar Orçamento"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
