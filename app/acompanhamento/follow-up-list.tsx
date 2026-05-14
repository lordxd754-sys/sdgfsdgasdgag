"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Send, Wand2, Loader2, MessageSquare } from "lucide-react";
import { daysSince, formatDate } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  email: string;
  lastContactAt: Date | null;
  createdAt: Date;
  goal: string | null;
  workouts: { title: string }[];
};

export function FollowUpList({
  students,
  autoFollowUp: initialAuto,
}: {
  students: Student[];
  autoFollowUp: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [autoFollowUp, setAutoFollowUp] = useState(initialAuto);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState("email");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function toggleAuto() {
    const next = !autoFollowUp;
    setAutoFollowUp(next);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoFollowUp: next }),
    });
    toast(next ? "Envio automático ativado!" : "Envio automático desativado");
  }

  async function generateMessage(student: Student) {
    setGenerating(true);
    const res = await fetch("/api/followups/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessage(data.message);
    } else {
      toast("Erro ao gerar mensagem", "error");
    }
    setGenerating(false);
  }

  async function sendMessage() {
    if (!selectedStudent || !message.trim()) return;
    setSending(true);
    const res = await fetch("/api/followups/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedStudent.id, message, channel }),
    });
    if (res.ok) {
      toast("Mensagem enviada!");
      setSelectedStudent(null);
      setMessage("");
      router.refresh();
    } else {
      toast("Erro ao enviar mensagem", "error");
    }
    setSending(false);
  }

  function openModal(student: Student) {
    setSelectedStudent(student);
    setMessage("");
    setChannel("email");
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{students.length} alunos ativos</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={toggleAuto}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              autoFollowUp ? "bg-green-500" : "bg-[#2a2a2a]"
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                autoFollowUp ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm text-gray-400">Envio automático</span>
        </label>
      </div>

      <div className="space-y-2">
        {students.map((student: (typeof students)[number]) => {
          const days = daysSince(student.lastContactAt ?? student.createdAt);
          const urgency = days > 15 ? "red" : days > 12 ? "yellow" : "green";

          return (
            <Card key={student.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    urgency === "red" ? "bg-red-500" : urgency === "yellow" ? "bg-yellow-500" : "bg-green-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-white">{student.name}</p>
                  <p className="text-xs text-gray-500">
                    {student.goal ?? "Sem objetivo definido"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    urgency === "red" ? "text-red-400" : urgency === "yellow" ? "text-yellow-400" : "text-green-400"
                  }`}>
                    {days === Infinity ? "Nunca contatado" : `${days} dias`}
                  </p>
                  <p className="text-xs text-gray-600">
                    {student.lastContactAt ? formatDate(student.lastContactAt) : formatDate(student.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant={urgency === "red" ? "default" : "outline"} onClick={() => openModal(student)}>
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </Card>
          );
        })}
        {students.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#2a2a2a] p-12 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">Nenhum aluno ativo</p>
          </div>
        )}
      </div>

      <Modal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={`Enviar mensagem para ${selectedStudent?.name}`}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedStudent && generateMessage(selectedStudent)}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Gerar com IA
          </Button>
          <Textarea
            rows={6}
            placeholder="Escreva a mensagem ou gere com IA..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
          </Select>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancelar</Button>
            <Button onClick={sendMessage} disabled={sending || !message.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
