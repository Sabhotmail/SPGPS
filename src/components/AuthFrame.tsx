import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthFrame({ title, description, children }: Props) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,440px)]">
      <section className="relative hidden flex-col justify-between border-r bg-sidebar px-12 py-14 lg:flex">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          FLEET TRACKING
        </p>
        <div>
          <p className="font-brand text-7xl font-semibold tracking-tight text-foreground">
            SPGPS
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            ติดตามตำแหน่งอุปกรณ์จาก Scalefusion และดูประวัติเส้นทางตามสิทธิ์กลุ่ม
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          สำหรับผู้ใช้ภายในองค์กรเท่านั้น
        </p>
      </section>

      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[340px] animate-fade-up">
          <p className="font-brand mb-10 text-xl font-semibold tracking-tight lg:hidden">
            SPGPS
          </p>
          <h1 className="text-[1.75rem] font-semibold leading-none tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {children}
        </div>
      </section>
    </div>
  );
}
