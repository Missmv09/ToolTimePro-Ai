"use client";
import { useForm } from "react-hook-form";

export default function Page() {
  const { register, handleSubmit } = useForm();
  async function onSubmit(data: any) {
    const res = await fetch("/api/shield/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, daysLate: Number(data.daysLate) }),
    });
    const json = await res.json();
    alert(json.summary);
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register("rateType")}> 
        <option value="hourly">Hourly</option>
        <option value="salary">Salary</option>
      </select>
      <input {...register("hourlyRate")} placeholder="Hourly Rate" />
      <input {...register("daysLate")} placeholder="Days Late" />
      <button type="submit">Calc</button>
    </form>
  );
}
