import { useEffect, useState, useRef } from "react";
import api from "../../lib/api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "../ui/command";
import { Search, Check } from "lucide-react";

/**
 * Props:
 * - tripId: string
 * - onNext?: () => void
 * - loading?: boolean (optional, but useful for parent control)
 */
export default function DestinationStep({ tripId, onNext, loading: externalLoading }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    const debounceRef = useRef();

    const isLoading = externalLoading || loading;

    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            loadResults(query);
        }, 250);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    async function loadResults(q = "") {
        try {
            const res = await api.get("/destinations", {
                params: q ? { q } : {},
            });
            setResults(res.data?.data || []);
        } catch (e) {
            setResults([]);
        }
    }

    async function setDestination() {
        if (!selectedId) return;
        setLoading(true);
        setErr(null);
        try {
            await api.put(`/trips/${tripId}/destination`, {
                destinationId: selectedId,
            });
            onNext && onNext();
        } catch (e) {
            setErr(e.response?.data?.message || "Failed to set destination");
        } finally {
            setLoading(false);
        }
    }

    const selectedDestination = results.find(
        (r) => (r.id || r._id) === selectedId
    );

    return (
        <Card className="relative mx-auto max-w-[800px] w-full h-[500px] rounded-[12px] flex flex-col justify-center items-center">
            <div className="flex-1 flex flex-col justify-center items-center w-full">
                <div className="w-full max-w-md space-y-4">
                    <h3 className="font-bold text-3xl text-center">Select destination</h3>

                    <div>
                        <label className="text-sm font-medium">Search & select destination</label>

                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left min-h-[44px] font-normal"
                                    >
                                        <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                                        {selectedDestination ? (
                                            <span>
                                                {selectedDestination.name}
                                                {selectedDestination.country
                                                    ? `, ${selectedDestination.country}`
                                                    : ""}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Search destinations…
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </PopoverTrigger>

                            <PopoverContent className="w-[448px] p-0">
                                <Command>
                                    <CommandInput
                                        placeholder="Type to search…"
                                        value={query}
                                        onValueChange={(v) => setQuery(v)}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No results.</CommandEmpty>
                                        <CommandGroup>
                                            {results.map((d) => {
                                                const id = d.id || d._id;
                                                return (
                                                    <CommandItem
                                                        key={id}
                                                        onSelect={() => setSelectedId(id)}
                                                    >
                                                        <div className="flex justify-between w-full items-center">
                                                            <div>
                                                                <div className="font-medium">{d.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {d.country || d.region || ""}
                                                                </div>
                                                            </div>
                                                            {selectedId === id && (
                                                                <Check className="w-4 h-4 text-green-600" />
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {err && <div className="text-sm text-red-600">{err}</div>}
                    </div>
                </div>
            </div >

            <div className="absolute bottom-8 right-12">
                <Button
                    onClick={setDestination}
                    disabled={!selectedId || isLoading}
                    className="px-12 py-5"
                >
                    {isLoading ? "Setting…" : "Next"}
                </Button>
            </div>
        </Card >
    );
}
