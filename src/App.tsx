import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Papa from "papaparse";
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import { AutoComplete } from "primereact/autocomplete";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

const Main = styled.main`
  padding: 2rem;
  max-width: 320px;
  margin: 0 auto;
  margin-top: 30vh;
  display: flex;
  gap: 20px;
  outline: 1px solid red;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-variant-numeric: tabular-nums;
  tr {
    border-bottom: 1px solid #ccc;
    &:hover {
      background-color: #f9f9f9;
    }
  }
  th,
  td {
    font-size: 1.05rem;
    padding: 0.75rem 2px;
    text-align: left;
  }
  th:last-child,
  td:last-child {
    text-align: right;
  }
`;

function App() {
  const [brand, setBrand] = useState<string>("");
  const [serial, setSerial] = useState<string | null>(null);

  const [csvData, setCsvData] = useState(null);

  useEffect(() => {
    const fetchCsv = async () => {
      const res = await fetch(`/assets/sheet_6_15_2024.csv`);
      const reader = res.body.getReader();
      const result = await reader.read();
      const decoder = new TextDecoder("utf-8");
      const csv = decoder.decode(result.value);
      const parsed = {};
      let lastBrand = "";
      let brand = "";
      let number = "";
      let license = "";
      csv.split("\n").forEach((line, i) => {
        if (i === 0) return;
        [brand = "", number = "", license = ""] = Papa.parse(line).data[0];
        license = license.replace(/,/g, "");
        if (license.includes("N/A")) return;
        if (brand) lastBrand = brand;
        if (!parsed[lastBrand]) parsed[lastBrand] = [];
        license = isNaN(license) ? license : parseInt(license);
        number = isNaN(number) ? number : parseInt(number);
        parsed[lastBrand].push({ year: number, license });
      });
      setCsvData(parsed);
      console.log(parsed);
    };
    fetchCsv();
  }, []);

  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  useEffect(() => {
    if (csvData) setFilteredBrands(Object.keys(csvData));
  }, [csvData]);
  const ref = useRef<HTMLInputElement>(null);

  if (!csvData) return <div>Loading...</div>;
  const brands = Object.keys(csvData);

  let answer = "";
  let isLastItem = false;
  if (brand && brands.includes(brand) && serial) {
    const data = csvData[brand];
    const index = data.findIndex((d: any) => {
      return d.license > serial;
    }); // TODO: else... find out if it's the last one
    console.log(data[data.length - 1].license, serial, index);
    if (index > 0) {
      data[index - 1]?.year;
      const year = data[index - 1]?.year;

      answer = Number(year);
    } else if (data[data.length - 1].license <= serial) {
      answer = Number(data[data.length - 1].year);
      isLastItem = true;
    }
  }

  return (
    <PrimeReactProvider>
      <Main className="flex-col">
        <div className="flex flex-col gap-2">
          <AutoComplete
            id="ac"
            placeholder="Piano brand"
            value={brand}
            dropdown
            onChange={(e) => setBrand(e.value)}
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
              }}
              onBlur={(e) => {
                setSerial(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ref.current) {
                  setSerial(ref.current.value);
                }
              }}
            />
            <Button icon="pi pi-search" className="p-button" />
          </div>
          {/* <Button label="Search" /> */}
          <div className="card flex justify-content-center">
            <Message
              severity="secondary"
              text={answer ? `Year: ${answer}` : "No matches found"}
              className="w-full"
            />
          </div>
          {/* <select
            onChange={(e) => {
              setBrand(e.target.value);
            }}
          >
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select> */}
        </div>
        <div>
          {brand && brands.includes(brand) && (
            <Table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Serial Range</th>
                </tr>
              </thead>
              <tbody>
                {csvData[brand].map((data: any, i: number) => {
                  const next = csvData[brand][i + 1];
                  const range = next ? Number(next.license) - 1 : "";
                  const answerInRange = answer && answer === data.year;
                  return (
                    <tr
                      key={i}
                      style={{ background: answerInRange ? "red" : "" }}
                    >
                      <td>{data.year}</td>
                      <td>
                        {data.license}
                        {range ? <>{`-${range}`}</> : "+"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </Main>
    </PrimeReactProvider>
  );
}

export default App;
