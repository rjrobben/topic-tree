document.addEventListener('DOMContentLoaded', () => {
    const treeContainer = document.getElementById('taxonomy-tree');
    const levelFilter = document.getElementById('level-filter');
    const expandAllButton = document.getElementById('expand-all');
    const collapseAllButton = document.getElementById('collapse-all');
    const exportJsonButton = document.getElementById('export-json');
    const statsContainer = document.getElementById('stats-container'); // Get stats container
    let taxonomyData = []; // To store the original data structure for export

    // --- Data Loading ---
    fetch('taxonomy.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            taxonomyData = data; // Store the original data
            treeContainer.innerHTML = ''; // Clear loading message
            const treeHtml = buildTreeHtml(data, 1); // Start level at 1
            treeContainer.appendChild(treeHtml);
            updateAndDisplayStats(); // Calculate and display initial stats
            setupEventListeners();
        })
        .catch(error => {
            treeContainer.innerHTML = `Error loading taxonomy: ${error.message}`;
            console.error('Error fetching taxonomy data:', error);
        });

    // --- HTML Tree Building ---
    function buildTreeHtml(nodes, level) {
        const ul = document.createElement('ul');
        ul.dataset.level = level;

        nodes.forEach((node, index) => {
            const li = document.createElement('li');
            li.dataset.level = level;
            li.dataset.originalIndex = index; // Store original index for data updates
            li.classList.add(`level-${level}`); // Add level class for styling

            // Toggle button (if node has children)
            if (node.children && node.children.length > 0) {
                const toggle = document.createElement('span');
                toggle.classList.add('toggle');
                toggle.addEventListener('click', toggleNode);
                li.appendChild(toggle);
            } else {
                // Add placeholder for alignment if no children
                const placeholder = document.createElement('span');
                placeholder.style.display = 'inline-block';
                placeholder.style.width = '1em'; // Match toggle width
                placeholder.style.marginRight = '5px';
                li.appendChild(placeholder);
            }

            // Code (if present)
            if (node.code) {
                const codeSpan = document.createElement('span');
                codeSpan.classList.add('node-code');
                codeSpan.textContent = `[${node.code}]`;
                li.appendChild(codeSpan);
            }

            // Editable Name
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('node-name');
            nameSpan.textContent = node.name;
            nameSpan.contentEditable = true; // Make it editable
            nameSpan.addEventListener('blur', updateNodeName); // Save on blur
            li.appendChild(nameSpan);

            // Add Child button
            const addChildBtn = document.createElement('button');
            addChildBtn.textContent = '+';
            addChildBtn.classList.add('add-child-btn');
            addChildBtn.title = 'Add child node';
            // Add listener later via delegation
            li.appendChild(addChildBtn);

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X'; // Or use an icon/SVG
            deleteBtn.classList.add('delete-node-btn');
            deleteBtn.title = 'Delete node';
            // Add listener later via delegation
            li.appendChild(deleteBtn);


            // Recursively build children
            if (node.children && node.children.length > 0) {
                const childrenUl = buildTreeHtml(node.children, level + 1);
                li.appendChild(childrenUl);
            }
            ul.appendChild(li);
        });
        return ul;
    }

    // --- Statistics Calculation and Display ---
    function calculateStats(nodes) {
        const stats = {};
        function traverse(nodeList, level) {
            if (!nodeList) return;
            stats[level] = (stats[level] || 0) + nodeList.length;
            nodeList.forEach(node => {
                if (node.children && node.children.length > 0) {
                    traverse(node.children, level + 1);
                }
            });
        }
        traverse(nodes, 1); // Start traversal at level 1
        return stats;
    }

    function displayStats(statsData) {
        if (!statsContainer) return;
        statsContainer.innerHTML = ''; // Clear previous stats
        const sortedLevels = Object.keys(statsData).map(Number).sort((a, b) => a - b);
        if (sortedLevels.length === 0) {
            statsContainer.textContent = 'No nodes found.';
            return;
        }
        sortedLevels.forEach(level => {
            const p = document.createElement('p');
            p.textContent = `Level ${level}: ${statsData[level]} node${statsData[level] !== 1 ? 's' : ''}`;
            statsContainer.appendChild(p);
        });
    }

    function updateAndDisplayStats() {
        const stats = calculateStats(taxonomyData);
        displayStats(stats);
    }


    // --- Event Handlers ---
    function toggleNode(event) {
        const toggle = event.target;
        const li = toggle.closest('li');
        if (li) {
            li.classList.toggle('expanded');
            toggle.classList.toggle('expanded');
        }
    }

    function updateNodeName(event) {
        const nameSpan = event.target;
        const li = nameSpan.closest('li');
        const newName = nameSpan.textContent.trim();

        // Find the corresponding node in the data structure and update it
        const path = getNodePath(li);
        let nodeRef = taxonomyData;
        path.forEach((index, i) => {
            if (i === path.length - 1) {
                nodeRef[index].name = newName; // Update the name in the data
            } else {
                nodeRef = nodeRef[index].children;
            }
        });
        // console.log("Updated data:", taxonomyData); // For debugging
        // Note: We might want to update stats here if names affect them, but they don't currently.
    }

    function addChildNode(parentLiElement) {
        const newNodeName = prompt("Enter name for the new child node:");
        if (!newNodeName || newNodeName.trim() === '') {
            return; // User cancelled or entered empty name
        }

        const path = getNodePath(parentLiElement);
        let parentNodeRef = taxonomyData;
        let parentDataArray = taxonomyData; // Keep track of the array containing the parent

        // Traverse to the parent node in the data structure
        path.forEach((index, i) => {
            if (i < path.length - 1) {
                parentNodeRef = parentNodeRef[index].children;
                parentDataArray = parentNodeRef; // Update the containing array reference
            } else {
                parentNodeRef = parentNodeRef[index]; // This is the actual parent node object
            }
        });


        // Create the new node data
        const newNode = { name: newNodeName.trim(), children: [] };

        // Add the new node to the parent's children array
        if (!parentNodeRef.children) {
            parentNodeRef.children = [];
        }
        parentNodeRef.children.push(newNode);

        // --- Update the DOM ---
        const parentLevel = parseInt(parentLiElement.dataset.level, 10);
        const newLevel = parentLevel + 1;

        // Ensure parent has a toggle button if it didn't before
        let toggle = parentLiElement.querySelector(':scope > .toggle');
        if (!toggle) {
            toggle = document.createElement('span');
            toggle.classList.add('toggle');
            toggle.addEventListener('click', toggleNode);
            // Insert toggle after the placeholder span
            const placeholder = parentLiElement.querySelector(':scope > span:not(.toggle):not(.node-code):not(.node-name)');
            if (placeholder) {
                parentLiElement.insertBefore(toggle, placeholder.nextSibling);
                placeholder.remove(); // Remove the placeholder now that we have a toggle
            } else { // Fallback if placeholder logic changes
                 parentLiElement.insertBefore(toggle, parentLiElement.firstChild);
            }
        }

        // Find or create the children UL
        let childrenUl = parentLiElement.querySelector(':scope > ul');
        if (!childrenUl) {
            childrenUl = document.createElement('ul');
            childrenUl.dataset.level = newLevel;
            parentLiElement.appendChild(childrenUl);
        }

        // Rebuild the children UL content
        childrenUl.innerHTML = ''; // Clear existing children in DOM
        const newChildrenHtml = buildTreeHtml(parentNodeRef.children, newLevel);
        // Append the content of the new UL to the existing one
        while (newChildrenHtml.firstChild) {
            childrenUl.appendChild(newChildrenHtml.firstChild);
        }


        // Expand the parent node to show the new child
        parentLiElement.classList.add('expanded');
        if(toggle) toggle.classList.add('expanded');


        // Update statistics
        updateAndDisplayStats();

        // Optional: Focus the new node's name span for editing? Maybe too complex for now.
    }

    function deleteNode(liElement) {
        const nodeName = liElement.querySelector('.node-name')?.textContent || 'this node';
        if (!confirm(`Are you sure you want to delete "${nodeName}" and all its children?`)) {
            return;
        }

        const path = getNodePath(liElement);
        let parentNodeRef = taxonomyData;
        let nodeIndexToDelete = -1;

        // Find the parent array and the index of the node to delete
        if (path.length === 1) {
            // Deleting a root node
            nodeIndexToDelete = path[0];
            parentNodeRef = taxonomyData; // The array itself is the parent reference
        } else {
            // Deleting a nested node
            let currentLevel = taxonomyData;
            for (let i = 0; i < path.length - 1; i++) {
                currentLevel = currentLevel[path[i]].children;
            }
            parentNodeRef = currentLevel; // This is the children array containing the node
            nodeIndexToDelete = path[path.length - 1];
        }

        if (nodeIndexToDelete !== -1 && parentNodeRef && parentNodeRef[nodeIndexToDelete]) {
            // Remove node from data
            parentNodeRef.splice(nodeIndexToDelete, 1);

            // --- Update the DOM ---
            const parentLiElement = liElement.parentElement?.closest('li'); // Get parent LI if it exists
            liElement.remove(); // Remove the LI element from the DOM

            // If the parent LI now has no children, remove its toggle button and UL
            if (parentLiElement) {
                 const remainingChildrenUl = parentLiElement.querySelector(':scope > ul');
                 if (remainingChildrenUl && !remainingChildrenUl.hasChildNodes()) {
                     remainingChildrenUl.remove(); // Remove empty UL
                     const toggle = parentLiElement.querySelector(':scope > .toggle');
                     if (toggle) {
                         // Replace toggle with placeholder for alignment
                         const placeholder = document.createElement('span');
                         placeholder.style.display = 'inline-block';
                         placeholder.style.width = '1em';
                         placeholder.style.marginRight = '5px';
                         parentLiElement.insertBefore(placeholder, toggle);
                         toggle.remove();
                     }
                     parentLiElement.classList.remove('expanded'); // Collapse parent visually
                 }
            }

            // Update statistics
            updateAndDisplayStats();
        } else {
            console.error("Could not find node to delete in data structure.", path);
            alert("Error: Could not delete node. Data inconsistency detected.");
        }
    }


    function getNodePath(liElement) {
        const path = [];
        let current = liElement;
        while (current && current.parentElement && current.parentElement.id !== 'taxonomy-tree') {
            if (current.tagName === 'LI' && current.dataset.originalIndex !== undefined) {
                path.unshift(parseInt(current.dataset.originalIndex, 10));
            }
            current = current.parentElement;
        }
        return path;
    }

    function filterLevels() {
        const selectedValue = levelFilter.value;
        const maxLevel = selectedValue === 'all' ? Infinity : parseInt(selectedValue, 10);
        const allLiElements = treeContainer.querySelectorAll('#taxonomy-tree li');

        // First pass: Hide elements strictly deeper than maxLevel
        allLiElements.forEach(li => {
            const level = parseInt(li.dataset.level, 10);
            if (level > maxLevel) {
                li.classList.add('hidden-by-filter');
            } else {
                li.classList.remove('hidden-by-filter');
            }
        });

        // Second pass: Ensure ancestors of visible nodes are also visible
        // Iterate backwards to process children before parents might be hidden
        const allVisibleLi = Array.from(treeContainer.querySelectorAll('#taxonomy-tree li:not(.hidden-by-filter)')).reverse();
        allVisibleLi.forEach(li => {
             let parentLi = li.parentElement?.closest('li');
             while(parentLi) {
                 parentLi.classList.remove('hidden-by-filter'); // Ensure parent is visible
                 parentLi = parentLi.parentElement?.closest('li');
             }
        });

         // Optional: Collapse nodes that are at the max level to hide deeper structure visually
         if (selectedValue !== 'all') {
            const nodesAtMaxLevel = treeContainer.querySelectorAll(`#taxonomy-tree li[data-level="${maxLevel}"]`);
            nodesAtMaxLevel.forEach(li => {
                const toggle = li.querySelector(':scope > .toggle');
                if (toggle) {
                    li.classList.remove('expanded');
                    toggle.classList.remove('expanded');
                }
            });
         }
    }


    function expandOrCollapseAll(expand) {
        const allToggles = treeContainer.querySelectorAll('.toggle');
        allToggles.forEach(toggle => {
            const li = toggle.closest('li');
            if (li) {
                if (expand) {
                    li.classList.add('expanded');
                    toggle.classList.add('expanded');
                } else {
                    li.classList.remove('expanded');
                    toggle.classList.remove('expanded');
                }
            }
        });
    }

    function exportJson() {
        // Update data structure from the DOM in case of edits
        // Note: This is a simplified update. A more robust solution might
        // directly modify taxonomyData on edit.
        function updateDataFromDOM(element, dataNode) {
             // Update current node's name
            const nameSpan = element.querySelector(':scope > .node-name');
            if (nameSpan) {
                 dataNode.name = nameSpan.textContent.trim();
            }

            // Recursively update children
            const childUl = element.querySelector(':scope > ul');
            if (childUl && dataNode.children) {
                const childLiElements = Array.from(childUl.children);
                childLiElements.forEach(childLi => {
                    const originalIndex = parseInt(childLi.dataset.originalIndex, 10);
                    if (!isNaN(originalIndex) && dataNode.children[originalIndex]) {
                         updateDataFromDOM(childLi, dataNode.children[originalIndex]);
                    }
                });
            }
        }

        // Start update from root elements
        const rootLiElements = Array.from(treeContainer.querySelector(':scope > ul').children);
         rootLiElements.forEach(rootLi => {
             const originalIndex = parseInt(rootLi.dataset.originalIndex, 10);
             if (!isNaN(originalIndex) && taxonomyData[originalIndex]) {
                 updateDataFromDOM(rootLi, taxonomyData[originalIndex]);
             }
         });


        const jsonString = JSON.stringify(taxonomyData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'taxonomy_updated.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    // --- Initial Setup ---
    function setupEventListeners() {
        levelFilter.addEventListener('change', filterLevels);
        expandAllButton.addEventListener('click', () => expandOrCollapseAll(true));
        collapseAllButton.addEventListener('click', () => expandOrCollapseAll(false));
        exportJsonButton.addEventListener('click', exportJson);

        // Event delegation for add child buttons
        treeContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-child-btn')) {
                const parentLi = event.target.closest('li');
                if (parentLi) {
                    addChildNode(parentLi);
                }
            } else if (event.target.classList.contains('delete-node-btn')) {
                 const nodeLi = event.target.closest('li');
                 if (nodeLi) {
                     deleteNode(nodeLi);
                 }
            }
        });
    }
});
