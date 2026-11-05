import { useCallback, useEffect, useState } from "react";
import type { Vehicle, VehicleStatus } from "../../../domain/vehicle";
import {
  createAdminVehicle,
  loadAdminVehicles,
  updateAdminVehicle,
} from "../../../infrastructure/supabase/adminVehicleRepository";
import { operationErrorMessage } from "../shared/errors";
import { createVehicleId } from "../vehicles/vehicleEditorModel";
import type { VehicleSavePayload } from "../vehicles/vehicleEditorModel";

export function useAdminVehicles(notify: (message: string) => void) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null);

  const loadVehiclesFromSupabase = useCallback(async (signal?: AbortSignal) => {
    setVehiclesLoading(true);
    setVehiclesError("");
    try {
      const nextVehicles = await loadAdminVehicles({ signal });
      if (!signal?.aborted) setVehicles(nextVehicles);
    } catch (error) {
      if (!signal?.aborted) setVehiclesError(operationErrorMessage(error));
    } finally {
      if (!signal?.aborted) setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadVehiclesFromSupabase(controller.signal);
    return () => controller.abort();
  }, [loadVehiclesFromSupabase]);

  const applySavedVehicle = useCallback((saved: Vehicle) => {
    setVehicles((current) => {
      const exists = current.some((vehicle) => vehicle.id === saved.id);
      const next = exists
        ? current.map((vehicle) => vehicle.id === saved.id ? saved : vehicle)
        : [saved, ...current];
      return next.sort((left, right) => {
        if (left.featured !== right.featured) return left.featured ? -1 : 1;
        return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
      });
    });
  }, []);

  const saveVehicle = useCallback(async (vehicle: VehicleSavePayload) => {
    const now = new Date().toISOString();
    const operationId = vehicle.id || "__new__";
    if (pendingVehicleId || vehiclesLoading) return false;
    const nextVehicle: Vehicle = {
      ...vehicle,
      id: vehicle.id || createVehicleId(vehicle, vehicles),
      sortOrder: vehicle.sortOrder ?? vehicles.length,
      updatedAt: now,
      createdAt: vehicle.createdAt || now,
    };
    const exists = vehicles.some((item) => item.id === nextVehicle.id);
    setPendingVehicleId(operationId);
    setVehiclesError("");
    try {
      const saved = exists
        ? await updateAdminVehicle(nextVehicle.id, nextVehicle, {
          expectedUpdatedAt: vehicle.updatedAt,
        })
        : await createAdminVehicle(nextVehicle);
      applySavedVehicle(saved);
      notify(exists ? "Մեքենայի տվյալները թարմացվեցին" : "Նոր մեքենան ավելացվեց");
      return true;
    } catch (error) {
      const message = operationErrorMessage(error);
      setVehiclesError(message);
      notify("Փոփոխությունը չպահպանվեց");
      throw error;
    } finally {
      setPendingVehicleId(null);
    }
  }, [applySavedVehicle, notify, pendingVehicleId, vehicles, vehiclesLoading]);

  const changeVehicleStatus = useCallback(async (vehicle: Vehicle) => {
    if (pendingVehicleId || vehiclesLoading) return;
    const status: VehicleStatus = vehicle.status === "published" ? "draft" : "published";
    setPendingVehicleId(vehicle.id);
    setVehiclesError("");
    try {
      const saved = await updateAdminVehicle(vehicle.id, { status }, {
        expectedUpdatedAt: vehicle.updatedAt,
      });
      applySavedVehicle(saved);
      notify(status === "published" ? "Մեքենան հրապարակվեց" : "Մեքենան տեղափոխվեց սևագիր");
    } catch (error) {
      setVehiclesError(operationErrorMessage(error));
      notify("Կարգավիճակը չփոխվեց");
    } finally {
      setPendingVehicleId(null);
    }
  }, [applySavedVehicle, notify, pendingVehicleId, vehiclesLoading]);

  const toggleFeatured = useCallback(async (vehicle: Vehicle) => {
    if (pendingVehicleId || vehiclesLoading) return;
    setPendingVehicleId(vehicle.id);
    setVehiclesError("");
    try {
      const saved = await updateAdminVehicle(vehicle.id, { featured: !vehicle.featured }, {
        expectedUpdatedAt: vehicle.updatedAt,
      });
      applySavedVehicle(saved);
      notify(vehicle.featured ? "Հեռացվեց գլխավոր էջից" : "Ավելացվեց գլխավոր էջում");
    } catch (error) {
      setVehiclesError(operationErrorMessage(error));
      notify("Փոփոխությունը չպահպանվեց");
    } finally {
      setPendingVehicleId(null);
    }
  }, [applySavedVehicle, notify, pendingVehicleId, vehiclesLoading]);

  const archiveVehicle = useCallback(async (vehicle: Vehicle) => {
    if (pendingVehicleId || vehiclesLoading) return false;
    setPendingVehicleId(vehicle.id);
    setVehiclesError("");
    try {
      const saved = await updateAdminVehicle(vehicle.id, { status: "archived", featured: false }, {
        expectedUpdatedAt: vehicle.updatedAt,
      });
      applySavedVehicle(saved);
      notify("Մեքենան արխիվացվեց");
      return true;
    } catch (error) {
      setVehiclesError(operationErrorMessage(error));
      notify("Մեքենան չարխիվացվեց");
      return false;
    } finally {
      setPendingVehicleId(null);
    }
  }, [applySavedVehicle, notify, pendingVehicleId, vehiclesLoading]);

  return {
    vehicles,
    vehiclesLoading,
    vehiclesError,
    pendingVehicleId,
    loadVehiclesFromSupabase,
    saveVehicle,
    changeVehicleStatus,
    toggleFeatured,
    archiveVehicle,
  };
}
