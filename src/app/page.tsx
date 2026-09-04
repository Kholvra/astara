import { env } from "~/env";
import { auth } from "~/server/auth";
import { AstaraHomePage } from "~/ui/AstaraHomePage";

export default async function Home() {
  const session = await auth();

  return (
    <AstaraHomePage
      mapStyleUrl={env.NEXT_PUBLIC_MAP_STYLE_URL}
      session={session}
    />
  );
}
