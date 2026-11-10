import { ShakeableLogo } from "@/components/ShakeableLogo";
import { NudgeHistoryButton } from "@/components/NudgeHistoryButton";
import { PurchasingResponsesButton } from "@/components/PurchasingResponsesButton";
import { type TaskDepartment } from "@/lib/departments";

export function TopBrandBanner({
  currentUserId,
  myDepartments,
  myJobTitleId,
}: {
  currentUserId: string;
  myDepartments: TaskDepartment[] | "all";
  myJobTitleId: string | null;
}) {
  return (
    <div
      className="relative flex w-full shrink-0 items-center justify-center border-b border-(--color-gray-200) py-3"
      style={{
        background: "linear-gradient(120deg, #ffffff 0%, #fbf6ef 55%, #f5ece0 100%)",
      }}
    >
      <ShakeableLogo
        src="/logo-vermelhinha.png"
        alt="A Gigante Vermelhinha — no tamanho do seu sonho"
        className="h-12 w-auto sm:h-14"
      />
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
        <PurchasingResponsesButton currentUserId={currentUserId} />
        <NudgeHistoryButton
          currentUserId={currentUserId}
          myDepartments={myDepartments}
          myJobTitleId={myJobTitleId}
        />
      </div>
    </div>
  );
}
