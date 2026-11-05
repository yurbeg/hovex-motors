interface VehicleGridSkeletonProps {
  count: number;
}

export function VehicleGridSkeleton({ count }: VehicleGridSkeletonProps) {
  return (
    <div className="grid grid-cols-3 gap-5 max-[1080px]:grid-cols-2 max-[800px]:grid-cols-1">
      {Array.from({ length: count }, (_, item) => (
        <div className="h-[540px] animate-pulse rounded-[17px] border border-[var(--border)] bg-white p-4 motion-reduce:animate-none [&_span]:block [&_span]:h-[245px] [&_span]:rounded-[10px] [&_span]:bg-[#e9e6e0] [&_i]:mt-[18px] [&_i]:block [&_i]:h-5 [&_i]:rounded-[10px] [&_i]:bg-[#e9e6e0] [&_i:nth-child(3)]:w-[70%] [&_i:nth-child(4)]:h-[78px]" key={item}>
          <span />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}
