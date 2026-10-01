"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, decimalToNumber } from "@/lib/utils";
import { VehicleStatusBadge } from "./vehicle-status-badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface AvailabilityResult {
  vehicle: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
    vehicleType: string;
    dailyRate: { toString(): string };
    status: string;
    owner: { name: string } | null;
  };
  available: boolean;
  conflicts: Array<{ type: string; label: string; startDate: Date; endDate: Date }>;
}

interface AvailabilitySearchProps {
  startDate: string;
  endDate: string;
  vehicleType: string;
  results: AvailabilityResult[];
}

export function AvailabilitySearch({ startDate, endDate, vehicleType, results }: AvailabilitySearchProps) {
  const router = useRouter();
  const [type, setType] = useState(vehicleType || "ALL");
  const availableCount = results.filter((r) => r.available).length;

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("startDate", form.get("startDate") as string);
    params.set("endDate", form.get("endDate") as string);
    params.set("vehicleType", type);
    router.push(`/vehicles/availability?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Check Availability</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-4 sm:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Pickup Date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={startDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Return Date</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={endDate} required />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="CAR">Car</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="VAN">Van</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Search Available Vehicles</Button>
          </form>
        </CardContent>
      </Card>

      {startDate && endDate && (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="success">{availableCount} available</Badge>
          <Badge variant="secondary">{results.length - availableCount} unavailable</Badge>
          <span className="text-muted-foreground">
            {formatDate(startDate)} — {formatDate(endDate)}
          </span>
        </div>
      )}

      {results.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Available</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conflicts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(({ vehicle, available, conflicts }) => (
                  <TableRow key={vehicle.id} className={available ? "" : "opacity-60"}>
                    <TableCell>
                      {available ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/vehicles/${vehicle.id}`} className="font-medium text-primary hover:underline">
                        {vehicle.registrationNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                    <TableCell>{vehicle.vehicleType}</TableCell>
                    <TableCell>{formatCurrency(decimalToNumber(vehicle.dailyRate))}</TableCell>
                    <TableCell>{vehicle.owner?.name || "—"}</TableCell>
                    <TableCell><VehicleStatusBadge status={vehicle.status as import("@prisma/client").VehicleStatus} /></TableCell>
                    <TableCell className="max-w-[200px]">
                      {conflicts.length > 0 ? (
                        <span className="text-xs text-muted-foreground">{conflicts.map((c) => c.label).join("; ")}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
