import { useState } from "react";
import api from "../../lib/api";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Share2, Copy } from "lucide-react";

/**
 * Props:
 *  - tripId
 *  - onNext() called when user wants to proceed to plan step
 */
export default function InviteStep({ tripId, onNext }) {
    const [emails, setEmails] = useState("");
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    async function createInvites() {
        if (!emails.trim()) {
            setErr("Enter at least one email (comma separated)");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            const arr = emails.split(",").map(s => s.trim()).filter(Boolean);
            const res = await api.post(`/trips/${tripId}/invites`, {
                emails: arr,
                expiresInMinutes: 1440,
            });
            const created = res.data?.data || [];
            const generatedLinks = created.map(c => c.link || c.url).filter(Boolean);
            setLinks(generatedLinks);
            setEmails("");
        } catch (e) {
            setErr(e.response?.data?.message || "Failed to create invites");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="relative mx-auto max-w-[800px] w-full h-[500px] rounded-[12px] flex flex-col justify-center items-center px-8 py-6">
            <div className="flex-1 flex flex-col justify-center items-center w-full">
                <div className="w-full max-w-xl space-y-4">
                    <h3 className="text-2xl font-bold text-center">Step 2 — Invite members</h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Comma-separated emails</label>
                        <Textarea
                            rows={3}
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder="alice@example.com, bob@example.com"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={createInvites} disabled={loading}>
                            {loading ? "Creating…" : "Create invites"}
                        </Button>
                    </div>

                    {links.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Invite links</div>
                                <div className="flex gap-2">
                                    <CopyAllButton links={links} />
                                    <ShareAllButton links={links} />
                                </div>
                            </div>

                            <div className="space-y-1 text-sm">
                                {links.map((l, i) => (
                                    <div key={i} className="break-all">
                                        <a
                                            href={l}
                                            className="underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {l}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {err && <div className="text-sm text-red-600">{err}</div>}
                </div>
            </div>

            <div className="absolute bottom-6 right-10">
                <Button onClick={() => onNext && onNext()} className="px-12 py-5">
                    Next
                </Button>
            </div>
        </Card>
    );
}

function CopyAllButton({ links }) {
    return (
        <Button
            className="rounded-full"
            variant="outline"
            onClick={async () => {
                const text = links.join("\n");
                try {
                    await navigator.clipboard.writeText(text);
                    alert("Copied invite links.");
                } catch {
                    alert("Copy failed.");
                }
            }}
        >
            <Copy />
        </Button>
    );
}
function ShareAllButton({ links }) {
    const handleShare = async () => {
        const text = links.join("\n");
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Trip Invite Links",
                    text: "Here are your invite links:",
                    url: links[0], // optionally just share the first one
                });
            } catch (err) {
                alert("Share cancelled or failed.");
            }
        } else {
            alert("Sharing is not supported on this device.");
        }
    };

    return (
        <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" /> Share
        </Button>
    );
}

