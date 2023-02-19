import { useMemo, useState } from "react";
import { Tooltip } from "primereact/tooltip";
import { FileTree } from "../FileTree";
import { RunProject } from "../run/Run";

interface SidebarItem {
  label: string;
  icon: (active: boolean) => JSX.Element;
  content: JSX.Element;
}

export default function Sidebar() {
  const items = useMemo(
    () => [
      {
        label: "File explorer",
        icon: function (active: boolean) {
          return (
            <svg
              width="50px"
              height="50px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              data-pr-tooltip={this.label}
            >
              <path
                d="M4 4C4 3.44772 4.44772 3 5 3H14H14.5858C14.851 3 15.1054 3.10536 15.2929 3.29289L19.7071 7.70711C19.8946 7.89464 20 8.149 20 8.41421V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V4Z"
                stroke={active ? "#200E32" : "grey"}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M20 8H15V3"
                stroke={active ? "#200E32" : "grey"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        },

        content: <FileTree />,
      },
      {
        label: "Run",
        icon: function (active: boolean) {
          return (
            <svg
              width="50px"
              height="50px"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              fill={active ? "#200E32" : "grey"}
              data-pr-tooltip={this.label}
            >
              <path d="M7.293 9.006l-.88.88A2.484 2.484 0 0 0 4 8a2.488 2.488 0 0 0-2.413 1.886l-.88-.88L0 9.712l1.147 1.146-.147.146v1H0v.999h1v.053c.051.326.143.643.273.946L0 15.294.707 16l1.1-1.099A2.873 2.873 0 0 0 4 16a2.875 2.875 0 0 0 2.193-1.099L7.293 16 8 15.294l-1.273-1.292A3.92 3.92 0 0 0 7 13.036v-.067h1v-.965H7v-1l-.147-.146L8 9.712l-.707-.706zM4 9.006a1.5 1.5 0 0 1 1.5 1.499h-3A1.498 1.498 0 0 1 4 9.006zm2 3.997A2.217 2.217 0 0 1 4 15a2.22 2.22 0 0 1-2-1.998v-1.499h4v1.499z" />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5 2.41L5.78 2l9 6v.83L9 12.683v-1.2l4.6-3.063L6 3.35V7H5V2.41z"
              />
            </svg>
          );
        },
        content: <RunProject />,
      },
      
    ],
    []
  );

  const [selectedItem, setSelectedItem] = useState<SidebarItem | null>(items[0]); // select the first item by default
  const [expanded, setExpanded] = useState(true); // expanded by default

  const onItemSelect = (item: SidebarItem) => {
    let nextExpanded = item !== selectedItem || !expanded;
    setExpanded(nextExpanded);

    setSelectedItem(nextExpanded ? item : null);

    // hide the sidebar if it's expanded by user resize
    const div = document.querySelector(".left-col") as HTMLDivElement;
    const currentGridTemplateColumns = div.style.gridTemplateColumns;
    div.style.gridTemplateColumns = currentGridTemplateColumns.replace(
      /[^ ]+/,
      "0fr"
    );
  };

  return (
    <div className="flex">
      <div className="background-gray-100 h-screen flex flex-col">
        <Tooltip target=".icon" mouseTrackLeft={10} showDelay={500} />
        {items.map((item) => (
          <div className="flex flex-col w-fit" key={item.label}>
            <button
              className={`flex items-center h-12 hover:bg-gray-200 px-2 py-8 hover:cursor-pointer icon ${
                item === selectedItem ? "border-l-4 border-blue-500" : ""
              }`}
              onClick={() => onItemSelect(item)}
            >
              {item.icon(item === selectedItem)}
            </button>
          </div>
        ))}
      </div>

      {/* if expanded, show the sidebar */}
      {expanded && (
        <div className="background-gray-100 h-screen flex flex-col p-2 w-full">
          <div className="flex flex-col w-full">{selectedItem?.content}</div>
        </div>
      )}
    </div>
  );
}
