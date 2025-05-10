document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const resultDiv = document.getElementById('result');
    const puntoVentaContainer = document.getElementById('puntoVentaContainer');
    const stockReportContainer = document.getElementById('stockReportContainer');
    const salesReportContainer = document.getElementById('salesReportContainer');
    const productSearchInputPV = document.getElementById('productSearchInputPV');
    const cartBody = document.getElementById('cartBody');
    const totalAmount = document.getElementById('totalAmount');
    const cashInput = document.getElementById('cashInput');
    const changeAmount = document.getElementById('changeAmount');
    const suggestions = document.getElementById('suggestions');
    const filterName = document.getElementById('filterName');
    const filterQuantity = document.getElementById('filterQuantity');
    const filterOperator = document.getElementById('filterOperator');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const loginContainer = document.getElementById('loginContainer');
    const userSelect = document.getElementById('userSelect');
    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.getElementById('loginButton');
    const mainContainer = document.getElementById('mainContainer');
    const salesDateInput = document.getElementById('reportDate');
 
    // Cambia esta línea
	salesDateInput.value = new Date().toLocaleDateString('en-CA');


    const salesReportBody = document.getElementById('salesReportBody');
    
    const nombreClienteInput = document.getElementById('nombreCliente');
    const ciRucInput = document.getElementById('ciRuc');
    nombreClienteInput.value = 'Consumidor Final';
    ciRucInput.value = '9999999999999';
  const clearCart = () => {
    cart = [];
    updateCartDisplay();
    updateTotal();
    cashInput.value = '';
    changeAmount.textContent = '$0.00';
};

// Luego se añade el eventListener al botón 'clearCartBtn'
document.getElementById('clearCartBtn').addEventListener('click', clearCart);


    let db = null;
    let cart = [];
    let isLoggedIn = false;

    const users = [
        { username: 'Gerencia', password: 'Margaret04' },
        { username: 'Administracion', password: 'us' },
    ];

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
    });

    const loadFile = async (file) => {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
            try {
                const uInt8Array = new Uint8Array(event.target.result);
                const SQL = await initSqlJs({
                    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                });
                db = new SQL.Database(uInt8Array);
                resultDiv.innerHTML = '<p>Base de datos cargada exitosamente.</p>';
                loadProducts();
            } catch (error) {
                resultDiv.innerHTML = `<p style="color: red;">Error al procesar el archivo: ${error.message}</p>`;
            }
        };
        fileReader.onerror = (error) => {
            resultDiv.innerHTML = `<p style="color: red;">Error al leer el archivo: ${error.message}</p>`;
        };
        fileReader.readAsArrayBuffer(file);
    };

    const loadProducts = () => {
        if (!db) return;

        const query = `
            SELECT p.ID, p.Name, p.Price, COALESCE(s.Quantity, 0) AS Quantity 
            FROM Product p 
            LEFT JOIN Stock s ON p.ID = s.ProductId;
        `;
        const result = db.exec(query);

        productSearchInputPV.addEventListener('input', () => {
            const inputValue = productSearchInputPV.value.toLowerCase();
            const filteredProducts = result[0].values.filter(row => row[1].toLowerCase().includes(inputValue));

            suggestions.innerHTML = '';
            if (inputValue) {
                filteredProducts.forEach(row => {
                    const suggestionItem = document.createElement('li');
                    suggestionItem.textContent = `${row[1]} - $${row[2]} (Stock: ${row[3]})`;
                    suggestionItem.dataset.id = row[0];
                    suggestionItem.dataset.price = row[2];
                    suggestionItem.dataset.stock = row[3];
                    suggestionItem.onclick = () => {
                        productSearchInputPV.value = row[1];
                        suggestions.style.display = 'none';
                        addToCart();
                    };
                    suggestions.appendChild(suggestionItem);
                });
                suggestions.style.display = filteredProducts.length > 0 ? 'block' : 'none';
            } else {
                suggestions.style.display = 'none';
            }
        });
    };

    const addToCart = () => {
        const productName = productSearchInputPV.value;
        const quantity = 1;
        const productId = Array.from(suggestions.children).find(item => item.textContent.startsWith(productName))?.dataset.id;
        const productPrice = Array.from(suggestions.children).find(item => item.textContent.startsWith(productName))?.dataset.price;

        if (!productId || isNaN(quantity) || quantity <= 0) {
            alert('Por favor, selecciona un producto v�lido.');
            return;
        }

        const existingProductIndex = cart.findIndex(item => item.id === productId);

        if (existingProductIndex > -1) {
            cart[existingProductIndex].quantity += quantity;
        } else {
            cart.push({
                id: productId,
                name: productName,
                quantity: quantity,
                price: parseFloat(productPrice),
            });
        }

        updateCartDisplay();
        updateTotal();
        productSearchInputPV.value = '';
        suggestions.style.display = 'none';
    };

    const updateCartDisplay = () => {
        cartBody.innerHTML = '';
        cart.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name.substring(0, 16)}</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" class="quantity-input" data-id="${item.id}">
                </td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${(item.price * item.quantity).toFixed(2)}</td>
                <td><button class="remove-button" data-id="${item.id}">Eliminar</button></td>
            `;
            cartBody.appendChild(row);
        });

        document.querySelectorAll('.remove-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.dataset.id;
                removeFromCart(id);
            });
        });

        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (event) => {
                const id = event.target.dataset.id;
                const newQuantity = parseInt(event.target.value);
                updateQuantity(id, newQuantity);
            });
        });
    };

    const updateQuantity = (id, newQuantity) => {
        const itemIndex = cart.findIndex(item => item.id === id);
        if (itemIndex > -1 && newQuantity >= 0) {
            if (newQuantity === 0) {
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].quantity = newQuantity;
            }
            updateCartDisplay();
            updateTotal();
        }
    };

    const updateTotal = () => {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalAmount.textContent = `$${total.toFixed(2)}`;
        updateChange();
    };

    const updateChange = () => {
        const cash = parseFloat(cashInput.value) || 0;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const change = cash - total;
        changeAmount.textContent = `$${change.toFixed(2)}`;
    };

    const removeFromCart = (id) => {
        cart = cart.filter(item => item.id !== id);
        updateCartDisplay();
        updateTotal();
    };

   

    const loadStockReport = () => {
        if (!db) return;

        const nameFilter = filterName.value.toLowerCase();
        const quantityFilter = filterQuantity.value;
        const operator = filterOperator.value;

        let query = `
            SELECT p.ID, p.Name, COALESCE(s.Quantity, 0) AS Quantity, p.Price, p.Cost
            FROM Product p
            LEFT JOIN Stock s ON p.ID = s.ProductId
            WHERE 1=1
        `;

        if (nameFilter) {
            query += ` AND p.Name LIKE '%${nameFilter}%'`;
        }

        if (quantityFilter) {
            query += ` AND COALESCE(s.Quantity, 0) ${operator} ${quantityFilter}`;
        }

        const result = db.exec(query);
        const stockBody = document.getElementById('stockBody');
        stockBody.innerHTML = '';
        if (result.length > 0) {
            result[0].values.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row[0]}</td>
                    <td>${row[1]}</td>
                    <td>${row[2]}</td>
                    <td>$${row[3].toFixed(2)}</td>
                    <td>$${row[4].toFixed(2)}</td>
                `;
                stockBody.appendChild(tr);
            });
        } else {
            stockBody.innerHTML = '<tr><td colspan="5">No se encontraron resultados.</td></tr>';
        }
    };

    

const generateSalesReport = () => {
    if (!db) return;

    const selectedDate = salesDateInput.value;
    if (!selectedDate) {
        alert('Por favor, selecciona una fecha.');
        return;
    }

const query = `
    SELECT d.ID AS DocumentID, d.Date AS DocumentDate, d.StockDate AS StockDate, d.Total AS DocumentTotal,
       p.Name AS ProductName, di.Price AS ProductPrice, di.Quantity AS Quantity,
       d.Discount AS Discount,
       (u.FirstName || ' ' || u.LastName) AS Usuario
FROM Document d
JOIN DocumentItem di ON d.ID = di.DocumentID
JOIN Product p ON di.ProductId = p.ID
LEFT JOIN User u ON d.UserId = u.ID
WHERE DATE(d.Date) = '${selectedDate}'
ORDER BY d.ID

`;

    const result = db.exec(query);
    salesReportBody.innerHTML = '';

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>ID Documento</th>
        <th>Fecha</th>
        <th>Fecha de Stock</th>
        <th>Total Documento</th>
        <th>Producto</th>
        <th>Precio</th>
        <th>Cantidad</th>
        <th>Descuento</th>
        <th>Usuario</th>
    `;
    salesReportBody.appendChild(headerRow);

    let totalByDocument = {};
    let totalByUser = {};
    let totalDaySum = 0;

    if (result.length > 0) {
        result[0].values.forEach(row => {
            const documentID = row[0];
            const documentDate = row[1];
            const stockDate = row[2];
            const documentTotal = row[3];
            const productName = row[4];
            const productPrice = row[5];
            const quantity = row[6];
            const discount = row[7];
            const username = row[8];

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${documentID}</td>
                <td>${documentDate}</td>
                <td>${stockDate}</td>
                <td>$${documentTotal.toFixed(2)}</td>
                <td>${productName}</td>
                <td>$${productPrice.toFixed(2)}</td>
                <td>${quantity}</td>
                <td>$${discount.toFixed(2)}</td>
                <td>${username}</td>
            `;
            salesReportBody.appendChild(tr);

        if (!totalByDocument[documentID]) {
    totalByDocument[documentID] = documentTotal;
    totalDaySum += documentTotal;
    
    if (username) {
        if (!totalByUser[username]) {
            totalByUser[username] = 0;
        }
        totalByUser[username] += documentTotal;
    }
}
   

 
        });

        const totalRow = document.createElement('tr');
        totalRow.innerHTML = `
            <td colspan="3"><strong>Total del Día</strong></td>
            <td><strong>$${totalDaySum.toFixed(2)}</strong></td>
            <td colspan="5"></td>
        `;
        salesReportBody.appendChild(totalRow);


for (const [user, total] of Object.entries(totalByUser)) {
    const userRow = document.createElement('tr');
    userRow.innerHTML = `
        <td colspan="3"><strong>Total de ${user}</strong></td>
        <td><strong>$${total.toFixed(2)}</strong></td>
        <td colspan="5"></td>
    `;
    salesReportBody.appendChild(userRow);
}


    } else {
        salesReportBody.innerHTML += '<tr><td colspan="9">No se encontraron resultados.</td></tr>';
    }
};




    uploadButton.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (file) {
            loadFile(file);
        } else {
            alert('Por favor, selecciona un archivo.');
        }
    });

    loginButton.addEventListener('click', () => {
        const username = userSelect.value;
        const password = passwordInput.value;
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            isLoggedIn = true;
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'block';
        } else {
            alert('Credenciales incorrectas.');
        }
    });

    document.getElementById('puntoVentaBtn').addEventListener('click', () => {
        puntoVentaContainer.style.display = 'block';
        stockReportContainer.style.display = 'none';
        salesReportContainer.style.display = 'none';
      productSearchInputPV.focus(); 
    });

    document.getElementById('stockBtn').addEventListener('click', () => {
        puntoVentaContainer.style.display = 'none';
        stockReportContainer.style.display = 'block';
        salesReportContainer.style.display = 'none';
        loadStockReport();
    });

    document.getElementById('salesReportBtn').addEventListener('click', () => {
        puntoVentaContainer.style.display = 'none';
        stockReportContainer.style.display = 'none';
        salesReportContainer.style.display = 'block';
    });

    document.getElementById('applyFiltersBtn').addEventListener('click', loadStockReport);
    document.getElementById('generateReportBtn').addEventListener('click', generateSalesReport);
    document.getElementById('logoutButton').addEventListener('click', () => {
        isLoggedIn = false;
        loginContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        clearCart();
    });
document.getElementById('printTicketBtn').addEventListener('click', generateTicketPDF);

});


async function generateTicketPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 10;
    doc.setFontSize(12);
    doc.text('*** TICKET DE VENTA ***', 20, y);
    y += 10;

    doc.text(`Cliente: ${nombreClienteInput.value}`, 10, y);
    y += 7;
    doc.text(`CI/RUC: ${ciRucInput.value}`, 10, y);
    y += 7;
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, y);
    y += 10;

    cart.forEach(item => {
        const line = `${item.name.substring(0, 20)} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`;
        doc.text(line, 10, y);
        y += 7;
    });

    y += 5;
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const cash = parseFloat(cashInput.value) || 0;
    const change = cash - total;

    doc.text('------------------------------', 10, y);
    y += 7;
    doc.text(`Total: $${total.toFixed(2)}`, 10, y);
    y += 7;
    doc.text(`Efectivo: $${cash.toFixed(2)}`, 10, y);
    y += 7;
    doc.text(`Cambio: $${change.toFixed(2)}`, 10, y);
    y += 10;
    
    doc.text('¡Gracias por su compra!', 20, y);

    doc.save(`ticket_${new Date().toISOString().slice(0, 10)}.pdf`);
    clearCart(); // Vacía el carrito automáticamente
}
