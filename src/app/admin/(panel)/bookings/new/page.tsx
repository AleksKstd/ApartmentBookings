import Link from "next/link";
import { createManualBooking } from "@/app/admin/actions";
import { AdminForm, Field } from "@/components/admin/form-kit";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Ръчна резервация" };

export default function NewBookingPage() {
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/bookings" className="text-sea-700 underline">← Всички резервации</Link></p>
      <PageHeader title="Ръчна резервация" description="За резервации по телефон, имейл или от други канали. Създава се като потвърдена." />
      <Panel className="max-w-3xl">
        <AdminForm action={createManualBooking} submitLabel="Създай резервация">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Настаняване" name="checkIn" type="date" required />
            <Field label="Напускане" name="checkOut" type="date" required />
            <Field label="Гости" name="guests" type="number" min={1} max={50} defaultValue={2} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Име и фамилия" name="guestName" required maxLength={120} />
            <Field label="Имейл" name="guestEmail" type="email" required maxLength={254} />
            <Field label="Телефон" name="guestPhone" maxLength={40} />
            <div>
              <label className="label" htmlFor="f-locale">Език на госта</label>
              <select id="f-locale" name="locale" className="input" defaultValue="bg">
                <option value="bg">Български</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-guestNote">Бележка</label>
            <textarea id="f-guestNote" name="guestNote" rows={3} className="input" maxLength={2000} />
          </div>
          <Field label="Обща сума в евро (по желание)" name="totalOverride" inputMode="decimal" placeholder="Празно = автоматично изчисление" hint="Оставете празно, за да се изчисли по текущите цени." />
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="paid" className="accent-sea-700" /> Платена</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="notify" className="accent-sea-700" /> Изпрати потвърждение на госта</label>
          </div>
        </AdminForm>
      </Panel>
    </>
  );
}
