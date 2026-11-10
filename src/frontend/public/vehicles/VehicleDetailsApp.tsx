import { resolveVehicleId } from "../../../app/routes";
import { VehicleDetailsPage } from "./VehicleDetailsPage";

export function VehicleDetailsApp() {
  const vehicleId = typeof window === "undefined"
    ? null
    : resolveVehicleId(window.location.pathname);

  return <VehicleDetailsPage vehicleId={vehicleId} />;
}
