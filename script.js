document.addEventListener('DOMContentLoaded', () => {
    const treeContainer = document.getElementById('taxonomy-tree');
    const levelFilter = document.getElementById('level-filter');
    const expandAllButton = document.getElementById('expand-all');
    const collapseAllButton = document.getElementById('collapse-all');
    const exportJsonButton = document.getElementById('export-json');
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

            // Recursively build children
            if (node.children && node.children.length > 0) {
                const childrenUl = buildTreeHtml(node.children, level + 1);
                li.appendChild(childrenUl);
            }
            ul.appendChild(li);
        });
        return ul;
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
    }
});
