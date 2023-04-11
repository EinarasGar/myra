import React from "react";

const Overview = () => {
  return (
    <div className="frappe relative max-w-5xl mx-auto pt-20 sm:pt-24 lg:pt-32">
      {/* <h1 className="text-slate-900 font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-center dark:text-white">
        Rapidly build modern websites without ever leaving your HTML.
      </h1>
      <p className="mt-6 text-lg text-slate-600 text-center max-w-3xl mx-auto dark:text-slate-400">
        A utility-first CSS framework packed with classes like flex pt-4
        text-center rotate-90 that can be composed to build any design, directly
        in your markup.
      </p> */}
      <div className="dark:bg-dark-600 shadow-xl rounded-lg">
        <div className=" p-6">
          <h5 className="mb-2 text-xl font-bold leading-tight tracking-tight text-dark-text dark:text-neutral-50">
            Overview
          </h5>
          <table className="w-full text-left">
            <thead>
              {/* <tr>
                <th className="">
                  <div className="py-2 pr-2 border-b border-slate-200 dark:border-slate-400/20">
                    Class
                  </div>
                </th>
                <th className="">
                  <div className="py-2 pl-2 border-b border-slate-200 dark:border-slate-400/20">
                    Properties
                  </div>
                </th>
              </tr> */}
              <th>Class</th>
              <th>Properties</th>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    // <div className="flex justify-center content-center my-4  bg-white p-6 shadow-lg dark:bg-slate-700 m-1/2">
    //   <div className="inline-block rounded-lg w-full">
    //     <h5 className="mb-2 text-xl font-medium leading-tight text-neutral-800 dark:text-neutral-50">
    //       Card title
    //     </h5>
    //     <div className="flex w-1/2">
    //       asdasdasddddddddddddddddddddddddddddddddddddddddddddddd
    //     </div>
    //   </div>
    // </div>
    // <div className="flex flex-col justify-center content-center rounded-xl dark:bg-slate-700 bg-clip-border">
    //   <div className="flex-1 p-6">
    //     <h5 className="mb-2 text-xl font-medium leading-tight text-neutral-800 dark:text-neutral-50">
    //       Card title
    //     </h5>
    //   </div>
    // </div>
  );
};

export default Overview;
