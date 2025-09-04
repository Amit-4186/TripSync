import { useEffect, useState, useRef } from "react";
import api from "../../lib/api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Plus, MapPin, Pencil } from "lucide-react";

/**
 * Props:
 *  - tripId
 *  - destinationId
 *  - onFinish() called when plan is created/completed
 */
export default function PlanStep({ tripId, destinationId, onFinish }) {
    const dropdownRef = useRef(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [placeQuery, setPlaceQuery] = useState("");
    const [placeResults, setPlaceResults] = useState([]);
    const [customSteps, setCustomSteps] = useState([]);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!destinationId) return;
        loadTemplates();
    }, [destinationId]);

    useEffect(() => {
        if (!placeQuery.trim() || !destinationId) {
            setPlaceResults([]);
            return;
        }

        const delayDebounce = setTimeout(() => {
            searchPlaces();
        }, 100); // debounce time

        return () => clearTimeout(delayDebounce);
    }, [placeQuery, destinationId]);
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setPlaceResults([]);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    async function loadTemplates() {
        try {
            const res = await api.get(`/destinations/${destinationId}/templates`);
            setTemplates(res.data?.data || []);
        } catch {
            setTemplates([]);
        }
    }

    async function applyTemplate(templateId) {
        if (!templateId) return;
        setLoading(true);
        setErr(null);
        try {
            await api.post(`/trips/${tripId}/plan/from-template`, { templateId });
            onFinish && onFinish();
        } catch (e) {
            setErr(e.response?.data?.message || "Failed to apply template");
        } finally {
            setLoading(false);
        }
    }

    async function searchPlaces() {
        try {
            const res = await api.get(`/destinations/${destinationId}/places`, {
                params: placeQuery ? { q: placeQuery } : {},
            });
            setPlaceResults(res.data?.data || []);
        } catch {
            setPlaceResults([]);
        }
    }


    function addCustom(place) {
        setCustomSteps(prev => [
            ...prev,
            { placeId: place.id || place._id, placeName: place.name, day: 1, note: "" },
        ]);
    }

    function updateCustom(idx, patch) {
        setCustomSteps(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    }

    function removeCustom(idx) {
        setCustomSteps(prev => prev.filter((_, i) => i !== idx));
    }

    async function submitCustom() {
        if (!customSteps.length) {
            setErr("No plan steps added");
            return;
        }
        setLoading(true);
        setErr(null);
        try {
            await api.post(`/trips/${tripId}/plan/custom`, { steps: customSteps });
            onFinish && onFinish();
        } catch (e) {
            setErr(e.response?.data?.message || "Failed to save plan");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="relative mx-auto max-w-[800px] w-full h-fit rounded-[12px] px-8 py-6 flex flex-col justify-start items-start space-y-6">
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <h3 className="text-2xl font-bold text-center">Step 3 — Create trip plan</h3>

                <div>
                    <h4 className="font-semibold mb-2">Build custom</h4>
                    <div className="relative mb-3">
                        <Input
                            placeholder="Search places…"
                            value={placeQuery}
                            onChange={(e) => setPlaceQuery(e.target.value)}
                        />
                        {placeResults.length > 0 && (
                            <div ref={dropdownRef} className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
                                {placeResults.map((p) => (
                                    <div
                                        key={p.id || p._id}
                                        className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                            addCustom(p);
                                            setPlaceQuery("");
                                            setPlaceResults([]);
                                        }}
                                    >
                                        <MapPin className="h-full pb-2" />
                                        <div className="w-full pl-1">
                                            <div className="font-medium">{p.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {p.address || p.category || "—"}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="ml-4 flex items-center gap-1 transition px-6 hover:bg-gray-200 hover:shadow-sm "
                                            onClick={() => {
                                                addCustom(p);
                                                setPlaceQuery("");
                                                setPlaceResults([]);
                                            }}
                                        >
                                            Add <Plus className="w-4 h-4" />
                                        </Button>

                                    </div>
                                ))}
                            </div>

                        )}
                    </div>

                    <div className="mt-4 mb-8">
                        <h5 className="font-medium mb-2">Planned steps</h5>
                        {customSteps.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nothing added yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {customSteps.map((s, i) => (
                                    <div key={i} className="grid md:grid-cols-4 gap-2 items-center">
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-sm text-muted-foreground">Day</span>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={s.day}
                                                onChange={(e) => updateCustom(i, { day: Number(e.target.value || 1) })}
                                                placeholder="1"
                                                className="pl-11 appearance-auto"
                                            />
                                        </div>

                                        <Input
                                            value={s.placeName}
                                            onChange={(e) => updateCustom(i, { placeName: e.target.value })}
                                        />
                                        <div className="relative">
                                            <Input
                                                className="pr-10"
                                                value={s.note || ""}
                                                onChange={(e) => updateCustom(i, { note: e.target.value })}
                                                placeholder="Add Note"
                                            />
                                            <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" onClick={() => removeCustom(i)}>
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* <div className="flex justify-end mt-3">
                            <Button onClick={submitCustom} disabled={loading || customSteps.length === 0}>
                                Save plan
                            </Button>
                        </div> */}
                    </div>
                </div>

                <div className="border-t-2 border-gray-300 pt-4">
                    <h4 className="font-semibold mb-2">Use a template</h4>
                    {templates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No templates for this destination.</p>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                            {templates.map(t => (
                                <Card key={t.id || t._id} className="p-3 flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{t.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {t.days ? t.days + "Days" : ""}
                                        </div>
                                    </div>
                                    <Button className="px-8" size="sm" onClick={() => applyTemplate(t.id || t._id)}>
                                        Use
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {err && <div className="text-sm text-red-600">{err}</div>}
            </div>

            <div className="absolute bottom-6 right-10">
                <Button onClick={() => onFinish && onFinish()} className="px-12 py-5">
                    Finish
                </Button>
            </div>
        </Card>
    );
}
