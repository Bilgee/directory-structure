(function() {
    var DirObject = function(path) {
        this.type = "folder"
        this.path = path;
        this.children = [];
        this.id = "file_list_container";
        var lastSlashIndex = path.split('/').length;
        this.name = path.split('/')[lastSlashIndex - 1];
    };

    var FileObject = function(path, id) {
        this.type = "file"
        this.path = path || "root";
        this.parentid = id || "local_root";
        var lastDotIndex = path.split('.').length;
        var lastSlashIndex = path.split('/').length;
        this.extension = path.split('.')[lastDotIndex - 1];
        this.name = path.split('/')[lastSlashIndex - 1];
    };

    //directories of image files
    var imgList = {
        folder : {
            empty : "./PNG/folder.png",
            plus : "./PNG/folder-plus.png",
            minus: "./PNG/folder-minus.png"
        },
        file :{
            text : "./PNG/file-text2.png"
        } 
    };

    var fileList = {
        dirCounter: 0,
        readDirCounter: 0,
        mainDirObj: {},
        dropZone: {},
        dataDrop: function(event) {
            //Event 
            event.stopPropagation();
            event.preventDefault();
            fileList.dropZone.style.backgroundColor = "#eae9e9";
            //Loading Data 
            var dataTransfer = event.dataTransfer;
            if (dataTransfer && dataTransfer.items) {
                var items = dataTransfer.items;
                //Single File or Folder
                if (items.length == 1) {
                    var item = items[0];
                    var entry;
                    if (item.getAsEntry) {
                        entry = item.getAsEntry();
                        //Supported only Chrome?
                    } else if (item.webkitGetAsEntry) {
                        entry = item.webkitGetAsEntry();
                    }
                    if (entry.isDirectory) {
                        //get the first folder data
                        fileList.mainDirObj = new DirObject(entry.fullPath);
                        fileList.mainDirObj.id = fileList.mainDirObj.id + "_root";
                        fileList.readAllEntry(entry, fileList.mainDirObj);
                    } else {
                        var text = document.getElementByid("text");
                        text.innerHTML = "Please drop a folder";
                    }
                } else {
                    var text = document.getElementByid("text");
                    text.innerHTML = "Please drop a folder";
                }
            }
        },
        dataDragover: function(event) {
            event.stopPropagation();
            event.preventDefault();
            fileList.dropZone.style.backgroundColor = "steelblue";
        },
        dataDragleave: function(event) {
            event.stopPropagation();
            event.preventDefault();
            fileList.dropZone.style.backgroundColor = "#eae9e9";
        },
        readAllEntry: function(entry, dirObject) {
            fileList.dirCounter++;
            var reader = entry.createReader();
            reader.readEntries(
                    // callback
                function(results) {
                    for (var id = 0; id < results.length; id++) {
                        if (results[id].isDirectory) {
                            var subDirObject = new DirObject(results[id].fullPath);
                            subDirObject.id = dirObject.id + "_" + id;
                            dirObject.children.push(subDirObject);
                            fileList.readAllEntry(results[id], dirObject.children[id]);
                        } else if (results[id].isFile) {
                            var fileObject = new FileObject(results[id].fullPath, dirObject.id);
                            dirObject.children.push(fileObject);
                        }
                    }
                    fileList.readDirCounter++;
                    if (fileList.dirCounter == fileList.readDirCounter) {
                        //alert("ALL ENTRIES LOADED");
                        fileList.generateStructure(fileList.mainDirObj);
                    }
                },
                // loading error
                        function(error) {
                            alert("File Loading Error!");
                        }
                );
            },
        init: function() {
            //Events
            fileList.dropZone = document.getElementById("dropZone");
            fileList.dropZone.addEventListener("drop", fileList.dataDrop, false);
            fileList.dropZone.addEventListener("dragover", fileList.dataDragover, false);
            fileList.dropZone.addEventListener("dragleave", fileList.dataDragleave, false);
        },
        generateStructure: function (structureData) {
            //svg size  
            var margin = {top: 20, right: 120, bottom: 20, left: 120};
            var width = 1200 - margin.right - margin.left;
            var height = 700 - margin.top - margin.bottom;
            var nodeCounter = 0;
            var duration = 750;
            var root;

            var tree = d3.layout.tree().size([height, width]);

            var diagonal = d3.svg.diagonal().projection(function(data) {
                return [data.y, data.x];
            });

            var svg = d3.select("body").append("svg")
                    .attr("width", width + margin.right + margin.left)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            root = structureData;
            root.x0 = height / 2;
            root.y0 = 0;

            update(root);

            d3.select(self.frameElement).style("height", "600px");

            //determine the data type
            function checkDir(data){
                if(data.type == "folder"){
                    if(!data.children && !data.hiddenChildren){
                        return imgList.folder.empty;
                    }else{
                        return data.children ? imgList.folder.minus : imgList.folder.plus;
                    }
                }else{
                    return imgList.file.text;
                }
            };

            function update(source) {
                // Compute the new tree layout.
                var nodes = tree.nodes(root).reverse();
                var links = tree.links(nodes);

                // Normalize for fixed-depth.
                nodes.forEach(function(data) {
                    data.y = data.depth * 160;
                });

                // Update the nodes
                var node = svg.selectAll("g.node")
                        .data(nodes, function(data) {
                            return data.id || (data.id = ++nodeCounter);
                        });

                // Enter any new nodes at the parent's previous position.
                var nodeEnter = node.enter().append("g")
                        .attr("class", function(data) {
                            if(data.children || data.hiddenChildren){
                                return "node cursor";
                            }
                            return "node";
                        })
                        .attr("transform", function(data) {
                            return "translate(" + source.y0 + "," + source.x0 + ")";
                        })
                        .on("click", click);

                nodeEnter.append("image")
                        .attr("xlink:href", function(data) {
                            return checkDir(data);
                        })
                        .attr("x", -8)
                        .attr("y", -8)
                        .attr("width", 16)
                        .attr("height", 16);         

                nodeEnter.append("text")
                        .attr("x", 13)
                        .attr("dy", ".35em")
                        .text(function(data) {
                            return data.name;
                        })
                        .style("fill-opacity", 1);

                // Transition nodes to their new position.
                var nodeUpdate = node.transition()
                        .duration(duration)
                        .attr("transform", function(data) {
                            return "translate(" + data.y + "," + data.x + ")";
                        });

                nodeUpdate.select("image")
                        .attr("xlink:href", function(data) {
                            return checkDir(data);
                        })


                nodeUpdate.select("text")
                        .style("fill-opacity", 1);

                // Transition exiting nodes to the parent's new position.
                var nodeExit = node.exit().transition()
                        .duration(duration)
                        .attr("transform", function(data) {
                            return "translate(" + source.y + "," + source.x + ")";
                        })
                        .remove();

                nodeExit.select("text")
                        .style("fill-opacity", 0);

                // Update the links
                var link = svg.selectAll("path.link")
                        .data(links, function(data) {
                            return data.target.id;
                        });

                // Enter any new links at the parent's previous position.
                link.enter().insert("path", "g")
                        .attr("class", "link")
                        .attr("d", function(data) {
                            var o = {x: source.x0, y: source.y0};
                            return diagonal({source: o, target: o});
                        });

                // Transition links to their new position.
                link.transition()
                        .duration(duration)
                        .attr("d", diagonal);

                // Transition exiting nodes to the parent's new position.
                link.exit().transition()
                        .duration(duration)
                        .attr("d", function(data) {
                            var o = {x: source.x, y: source.y};
                            return diagonal({source: o, target: o});
                        })
                        .remove();

                // Stash the old positions for transition.
                nodes.forEach(function(data) {
                    data.x0 = data.x;
                    data.y0 = data.y;
                });
            };

            // Toggle children on click.
            function click(data) {
                if (data.children) {
                    data.hiddenChildren = data.children;
                    data.children = null;
                } else {
                    data.children = data.hiddenChildren;
                    data.hiddenChildren = null;
                }
                update(data);
            };
        }
    };

    window.addEventListener('load', function() {
        fileList.init();
    });
})();