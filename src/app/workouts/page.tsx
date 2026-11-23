// FRONTEND-OWNED. Workout logging and history.
import { getWorkoutHistory } from "@/services";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { WorkoutForm } from "@/components/workouts/WorkoutForm";
import { WorkoutHistory } from "@/components/workouts/WorkoutHistory";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const workouts = await getWorkoutHistory();

  return (
    <Page title="Workouts" subtitle="Log your training and earn Gold, Materials and XP.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <Panel title="Log a workout">
          <WorkoutForm />
        </Panel>
        <Panel title="History">
          <WorkoutHistory workouts={workouts} />
        </Panel>
      </div>
    </Page>
  );
}
