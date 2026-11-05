import { useEffect, useMemo, useRef, useState } from "react";
import type { Vehicle } from "../../../domain/vehicle";
import type { ConsultationHandler, ConsultationSource } from "../shared/types";

export function usePublicInteractions(vehicles: Vehicle[]) {
  const [compared, setCompared] = useState<string[]>([]);
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
  const [consultVehicleId, setConsultVehicleId] = useState<string | null | undefined>(undefined);
  const [compareOpen, setCompareOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [consultSource, setConsultSource] = useState<ConsultationSource>("website");
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const modalOpen = Boolean(detailVehicle) || consultVehicleId !== undefined || compareOpen;

  const comparedVehicles = useMemo(() => vehicles.filter((vehicle) => compared.includes(vehicle.id)), [compared, vehicles]);
  const selectedConsultVehicle = useMemo(() => vehicles.find((vehicle) => vehicle.id === consultVehicleId) || null, [consultVehicleId, vehicles]);

  useEffect(() => {
    const currentVehicles = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
    setCompared((current) => current.filter((id) => currentVehicles.has(id)));
    setDetailVehicle((current) => current ? currentVehicles.get(current.id) || null : null);
    setConsultVehicleId((current) => (
      typeof current === "string" && !currentVehicles.has(current) ? null : current
    ));
  }, [vehicles]);

  useEffect(() => {
    document.body.classList.toggle("modal-open", modalOpen);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setDetailVehicle(null);
      setConsultVehicleId(undefined);
      setCompareOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => {
    document.body.classList.toggle("has-compare", compared.length > 0);
    return () => document.body.classList.remove("has-compare");
  }, [compared.length]);

  useEffect(() => {
    if (compareOpen && compared.length < 2) setCompareOpen(false);
  }, [compareOpen, compared.length]);

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);

  const showNotice = (message: string): void => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const toggleCompare = (id: string): void => {
    if (!compared.includes(id) && compared.length >= 3) {
      showNotice("Կարող եք համեմատել առավելագույնը 3 մեքենա։");
      return;
    }
    setCompared((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  const removeCompareItem = (id: string): void => {
    setCompared((current) => current.filter((item) => item !== id));
  };

  const openCompare = (): void => {
    if (compared.length < 2) {
      showNotice("Համեմատելու համար ընտրեք առնվազն 2 մեքենա։");
      return;
    }
    setCompareOpen(true);
  };

  const openConsultation: ConsultationHandler = (id, source = "website") => {
    setDetailVehicle(null);
    setCompareOpen(false);
    setAssistantOpen(false);
    setConsultSource(source);
    setConsultVehicleId(id ?? null);
  };

  const closeConsultation = (): void => {
    setConsultVehicleId(undefined);
    setConsultSource("website");
  };

  return {
    assistantOpen,
    closeConsultation,
    compareOpen,
    compared,
    comparedVehicles,
    consultSource,
    consultVehicleId,
    detailVehicle,
    notice,
    openCompare,
    openConsultation,
    removeCompareItem,
    selectedConsultVehicle,
    setAssistantOpen,
    setCompareOpen,
    setCompared,
    setDetailVehicle,
    showNotice,
    toggleCompare,
  };
}
