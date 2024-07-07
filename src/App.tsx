// TODO: Clean up!
// - More hooks + comps
// - Check with staff to get answers to data questions and maybe combine some data

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import Papa from "papaparse";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import { AutoComplete } from "primereact/autocomplete";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { X } from "react-feather";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

const Main = styled.main`
  padding: 0 1.5rem 2rem;
  max-width: 320px;
  margin: 0 auto;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0px 5px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  tr {
    border-bottom: 1px solid #eee;
  }
  th,
  td {
    font-size: 1.05rem;
    padding: 0.4rem 2px;
    text-align: left;
  }
  th:last-child,
  td:last-child {
    text-align: right;
  }
`;

type Res = { brand: string; serial: string; year: number | null };

function App() {
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<string>("");
  const [serial, setSerial] = useState<string>("");
  const [csvData, setCsvData] = useState<null | {
    [k: string]: { year: number; license: string }[];
  }>(null);
  const [showMatches, setShowResults] = useState(false);
  const [results, setResults] = useState<Res[]>([]); // so you can see your last values might be helpful

  const brands = useMemo(
    () => (csvData ? Object.keys(csvData) : []),
    [csvData]
  );
  const brandIsValid = brands.length > 0 && brands.includes(brand);

  useEffect(() => {
    const fetchCsv = async () => {
      try {
        const res = await fetch(`/assets/sheet_6_15_2024.csv`);
        if (!res.ok || !res.body) throw new Error("Failed to fetch CSV");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let csv = "";
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            csv += decoder.decode(value, { stream: !done });
          }
        }
        const parsed: { [k: string]: { year: number; license: string }[] } = {};
        let lastBrand = "";
        csv.split("\n").forEach((line, i) => {
          if (i === 0) return;
          const parsedLine = Papa.parse(line).data[0]! as string[];
          if (parsedLine.every((l) => !l)) return; // skip empty lines
          if (parsedLine[2].includes("N") && parsedLine[2].includes("A"))
            return; // skip N/A
          const lineBrand = parsedLine[0] || lastBrand;
          lastBrand = lineBrand;
          const year = Number(parsedLine[1]);
          const license = (parsedLine[2] || "").replace(/,/g, "");
          if (!parsed[lastBrand]) parsed[lastBrand] = [];
          parsed[lastBrand].push({ year, license });
        });
        setCsvData(parsed);
      } catch (error) {
        setError("Failed to fetch CSV");
      }
    };
    fetchCsv();
  }, []);

  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  useEffect(() => {
    if (brands.length) setFilteredBrands(brands);
  }, [brands]);
  const ref = useRef<HTMLInputElement>(null);

  const setResult = () => {
    if (brandIsValid && serial.trim() && csvData) {
      const data = csvData[brand];
      const serialNum = Number(serial);
      const index = data.findIndex((d) => {
        return Number(d.license) > serialNum;
      });
      let year = null;
      if (index > 0) {
        year = data[index - 1]?.year;
      } else if (Number(data[data.length - 1].license) <= serialNum) {
        year = data[data.length - 1].year;
      }
      // TODO: Don't add if the last one is the same
      const lastResult = results[results.length - 1];
      if (
        !lastResult ||
        lastResult.serial !== serial.trim() ||
        lastResult.brand !== brand
      ) {
        setResults([...results, { brand, serial: serial.trim(), year }]);
        setShowResults(true);
      } else {
        setShowResults(true);
      }
    } else setShowResults(false);
  };

  const autoRef = useRef<AutoComplete>(null);

  if (!csvData) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const itemTemplate = (item: string) => {
    const active = brand === item;
    return (
      <span
        style={{
          fontWeight: active ? "bold" : "",
        }}
        className={active ? "active-dd" : ""}
      >
        {item}
      </span>
    );
  };
  const onDropdownClick = () => {
    // Highlight and scroll to the selected option when dropdown is opened
    setTimeout(() => {
      if (autoRef.current) {
        const highlightOption = (element: HTMLElement) => {
          if (element) {
            element.scrollIntoView({ block: "center" });
          }
        };
        const el = document.querySelector(".active-dd") as HTMLElement;
        if (el) highlightOption(el!);
      }
    }, 30);
  };

  const searchDisabled =
    !(brandIsValid && serial.trim() && csvData) ||
    !!(results ?? []).find(
      (r) => r.serial.trim() === serial && r.brand.trim() === brand
    );

  return (
    <PrimeReactProvider>
      <Main>
        <div
          className="flex-col flex gap-[20px] pt-8"
          style={{ background: "#fff" }}
        >
          <img
            src="/assets/logo.png"
            alt="logo"
            style={{ width: "75%", margin: "0 auto" }}
          />
          <h3 className="mb-0 text-center mt-9">Piano year lookup</h3>
          <div className="flex flex-col gap-2">
            <AutoComplete
              onDropdownClick={onDropdownClick}
              ref={autoRef}
              itemTemplate={itemTemplate}
              forceSelection
              key={Object.keys(csvData).length}
              scrollHeight="450px"
              id="ac"
              placeholder="Brand"
              value={brand}
              dropdown
              onChange={(e) => {
                setBrand(e.value);
                setShowResults(false);
              }}
              completeMethod={(e) => {
                const filtered = brands.filter((b) =>
                  b.toLowerCase().includes(e.query.toLowerCase())
                );
                setFilteredBrands(filtered);
              }}
              suggestions={filteredBrands}
            />
            <div className="p-inputgroup flex-1">
              <InputText
                ref={ref}
                placeholder="Serial number"
                type={"text"}
                onChange={(e) => {
                  setSerial(e.target.value);
                  setShowResults(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setResult();
                }}
              />
            </div>
            {
              <Button
                className="justify-center"
                severity={!searchDisabled ? undefined : "secondary"}
                onClick={setResult}
                // text={searchDisabled}
                outlined={searchDisabled}
                disabled={searchDisabled}
              >
                Search
              </Button>
            }
          </div>
        </div>
        <div style={{ zIndex: -1 }}>
          {results.length > 0 && (
            <div className="flex gap-4 mt-7 flex-col">
              <DataTable
                value={results
                  .reduce((a: Res[], c: Res) => {
                    if (
                      a.find(
                        (r) => r.brand === c.brand && r.serial === c.serial
                      )
                    )
                      return a;
                    return [...a, c];
                  }, [])
                  .reverse()
                  .map((res) => {
                    return {
                      brand: res.brand,
                      serial: res.serial,
                      year: (
                        <span className="flex items-center justify-end">
                          {res.year || "N/A"}
                          <IconButton
                            onClick={() => {
                              setResults(
                                results.filter(
                                  (r) =>
                                    r.serial !== res.serial ||
                                    r.brand !== res.brand
                                )
                              );
                            }}
                          >
                            <X style={{ color: "#ccc" }} />
                          </IconButton>
                        </span>
                      ),
                    };
                  })}
                className="w-full"
                size="small"
                stripedRows
                showHeaders={false}
                header="Results"
              >
                <Column field="brand" header="Brand" />
                <Column field="serial" header="Serial" />
                <Column field="year" header="Year" align={"center"} />
              </DataTable>
            </div>
          )}
          {brand && (
            <Button
              onClick={() => setShowDebug(!showDebug)}
              text
              severity="secondary"
              className="block !text-center justify-center mt-8 mb-3 w-full"
            >
              {showDebug ? "Hide" : "Show"} serial data for {brand}
            </Button>
          )}
          <div className="mt-6">
            {brandIsValid && showDebug && (
              <Table>
                <thead>
                  <tr className="!border-none">
                    <th colSpan={2} className="!text-left !pb-0 !mb-0">
                      {brand}
                    </th>
                  </tr>
                  <tr>
                    <th>Year</th>
                    <th>Serial No.</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData[brand].map((data, i: number) => {
                    const next = csvData[brand][i + 1];
                    // const range = next ? Number(next.license) - 1 : "";

                    // @ts-expect-error -  checking if a number
                    const isNumber = !isNaN(data.license);
                    // @ts-expect-error -  checking if a number
                    const nextIsNumber = next && !isNaN(next?.license);
                    const foundError =
                      !isNumber ||
                      (nextIsNumber
                        ? Number(next?.license) < Number(data.license)
                        : false) ||
                      (next ? next.year === data.year : false);
                    const answerInRange =
                      showMatches &&
                      results[results.length - 1]?.year === data.year;
                    let background = "transparent";
                    let color = "black";

                    if (answerInRange) {
                      background = "var(--highlight-bg)";
                      color = "var(--highlight-text-color)";
                    }
                    if (foundError) {
                      background = "red";
                      color = "white";
                    }
                    return (
                      <tr key={i} style={{ background, color }}>
                        <td>{data.year}</td>
                        <td>
                          {data.license}
                          {/* {range ? <>{`-${range}`}</> : "+"} */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      </Main>
    </PrimeReactProvider>
  );
}

export default App;
