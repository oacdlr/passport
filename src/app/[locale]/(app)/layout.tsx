import { TopNav } from "@/components/layout/top-nav";
import { requireUser } from "@/features/auth/guards";

/** Todo lo que cuelga de aquí exige sesión. El middleware ya redirige, esto
 *  es el segundo cerrojo por si una ruta se escapa del matcher. */
export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  await requireUser();

  return (
    <>
      <TopNav />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        {children}
      </main>
    </>
  );
}
