'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SelectScrollable } from './Select';
import { Input } from '@/components/ui/input';
import { Button } from './ui/button';
import React, { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import { Tree } from './TreeNode';
import { ChevronDown } from 'lucide-react';



const buildTree = (filePaths) => {
  const root = [];

  filePaths.forEach((path) => {
    const parts = path.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const existingNode = currentLevel.find((node) => node.label === part);

      if (existingNode) {
        currentLevel = existingNode.children;
      } else {
        const newNode = {
          key: `${currentLevel.length}`,
          label: part,
          children: [],
        };

        currentLevel.push(newNode);

        if (index === parts.length - 1) {
          delete newNode.children;
        } else {
          currentLevel = newNode.children;
        }
      }
    });
  });

  return root;
};

function isValidGitHubURL(url) {
  const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/\S*$/;
  return githubRegex.test(url);
}

const Resizable = () => {
  const { toast } = useToast();
  const [filename, setFilename] = useState('GitHub Repo');
  const [ws, setWs] = useState(null);
  const getInput = useRef();
  const vulnContainerRef = useRef();
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [progress, setProgress] = useState(0);
  const fileLengthRef = useRef(0);
  const [counter, setCounter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [fileStructure, setFileStructure] = useState({});

  useEffect(() => {
    const newWs = new WebSocket('ws://localhost:8765');
    newWs.onmessage = (event) => {
      console.log("Message received from server:", event.data);
      const data = JSON.parse(event.data);
      console.log("Parsed data:", data);
  
      if (data.any_vulnerability_found) {
        console.log("Vulnerability found:", data);
        setLoading(false);
        setCounter((prevCounter) => {
          const newCounter = prevCounter + 1;
          console.log("New counter value:", newCounter);
          
          console.log("File Length:", fileLengthRef.current);
          
          const percentage = parseInt((newCounter / fileLengthRef.current) * 100);
          setProgress(percentage);
          console.log("New progress value:", percentage);
          if (percentage === 100) {
            setDisableBtn(false);
          }
          return newCounter;
        });
  
        const newVulnerability = {
          vulnerability_type: data.vulnerability_type,
          location: data.location,
          vulnerability_description: data.vulnerability_description,
          solution_description: data.solution_description,
        };
  
        setVulnerabilities((prev) => [...prev, newVulnerability]);
      } else if (data.file_length) {
        console.log("File length received:", data.file_length);
        const fileLengthTemp = parseInt(data.file_length)
        fileLengthRef.current = fileLengthTemp;
      } else if (data.status === 'completed') {
        toast({
          title: 'XENO AI',
          description: 'Analysis Completed Successfully',
        });
      } else if (data.error) {
        setLoading(false);
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: data.error,
        });
      } else if (data.file_structure) {
        console.log("Received file_structure:", data.file_structure);
        const treeData = buildTree(data.file_structure);
        console.log("Built treeData:", treeData);
        setFileStructure(treeData);
      }
    };
    setWs(newWs);
  
    return () => {
      newWs.close();
    };
  }, [toast]);




  useEffect(() => {

    console.log("Counter updated:", counter);
    console.log("Progress updated:", progress);
    console.log("File Structure updated:", fileStructure);
    console.log("File Length updated:", fileLengthRef);

  }, [counter, progress, fileStructure, fileLengthRef]);


  const sendData = () => {
    setVulnerabilities([]);
    setLoading(true);
    setDisableBtn(true);
    setProgress(0);
    setCounter(0);
    fileLengthRef.current = 0

    if (ws && getInput.current) {
      const url = getInput.current.value;
      const isValidURL = isValidGitHubURL(url);

      if (!isValidURL) {
        setLoading(false);
        return;
      }

      const parts = url.split('/');
      const repoName = parts[parts.length - 1].replace('.git', '');
      console.log("Repository name:", repoName);
      setFilename(repoName);
      ws.send(JSON.stringify({ url }));
    }
  };

  

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-screen w-full rounded-lg border"
    >
      <ResizablePanel defaultSize={15}>
        <div className="flex h-full flex-col ">
          <div className="border-b flex  justify-center items-center w-full h-[60px] p-2">
            <SelectScrollable />
          </div>
          {(!(Object.keys(fileStructure).length === 0
))? (<div className='w-full gap-2 p-2 h-full flex flex-col overflow-auto'>
            <span className='text-sm flex font-medium'><ChevronDown className='mr-2 w-[16px] ' />{filename}</span>
            <Tree treeData={fileStructure} className="ml-8" />
</div>) :""}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={45}>
        <div className="flex flex-col h-full">
          <div className="border-b flex justify-between items-center w-full h-[60px] p-6">
            <span className="text-lg font-medium tracking-wide">{filename}</span>
            {progress > 0 && (
              <div className="flex flex-col text-xs gap-2">
                <span>{progress}% Repo Analyzed</span>
                <Progress className="w-[100%] rounded h-[5px]" value={progress} />
              </div>
            )}
          </div>
          <div className="m-2 flex flex-row gap-2">
            <Input ref={getInput} type="text" placeholder="GitHub URL" />
            <Button onClick={sendData} disabled={disableBtn}>
              Submit
            </Button>
          </div>
          <div
            id="hub"
            ref={vulnContainerRef}
            className="flex flex-col h-full gap-2 w-full p-2 overflow-y-auto"
          >
            {loading && (
              <div className="text-white flex justify-center h-full items-center">
                <Image
                  src="/logoWithWhite.png"
                  className="mr-4 spin-infinite"
                  alt="Logo"
                  width={20}
                  height={20}
                />
                <span className="text-xs">Spinning Containers</span>
              </div>
            )}
            {!loading && vulnerabilities.length === 0 && (
              <div className="text-white flex justify-center h-full items-center">
                <Image
                  src="/logoWithWhite.png"
                  className="mr-4"
                  alt="Logo"
                  width={20}
                  height={20}
                />
              </div>
            )}
            {vulnerabilities &&
              vulnerabilities.map((vuln, index) => (
                <Card className="cursor-pointer hover:bg-neutral-700" key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {vuln.vulnerability_type}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      File Path: {vuln.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-white text-xs">
                      Vulnerability: {vuln.vulnerability_description}
                    </CardDescription>
                    <CardDescription className="text-white mt-2 text-xs">
                      Solution: {vuln.solution_description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full justify-center">
          <div className="border-b w-full h-[60px]"></div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Resizable;
