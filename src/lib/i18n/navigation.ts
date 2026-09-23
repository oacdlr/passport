import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Envolturas de next/link y next/navigation que añaden el prefijo de locale solas.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
