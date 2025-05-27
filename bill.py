import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import datetime
import csv
import os
import requests
import webbrowser
from msal import PublicClientApplication

# === Constants ===
DATA_FILE = "expenses.csv"
CREDENTIALS = {"neha": "user123", "admin": "admin123"}
CLIENT_ID = "b11001d0-8a8e-423a-b403-393a4ad78ce7"
LAVENDER_BG = "#E6E6FA"
TEXT_COLOR = "#4B0082"
BTN_BG = "#9370DB"
BTN_FG = "white"

# === OneDrive Upload ===
def upload_to_onedrive(filepath, filename):
    authority = "https://login.microsoftonline.com/common"
    scopes = ["Files.ReadWrite.All"]

    app = PublicClientApplication(CLIENT_ID, authority=authority)
    accounts = app.get_accounts()
    result = app.acquire_token_silent(scopes, account=accounts[0]) if accounts else None

    if not result:
        result = app.acquire_token_interactive(scopes=scopes)

    if "access_token" in result:
        headers = {"Authorization": f"Bearer {result['access_token']}"}
        with open(filepath, "rb") as f:
            content = f.read()

        url = f"https://graph.microsoft.com/v1.0/me/drive/root:/Apps/BillingApp/{filename}:/content"
        response = requests.put(url, headers=headers, data=content)

        if response.status_code in [200, 201]:
            print("Uploaded to OneDrive")
        else:
            print("Upload failed:", response.text)
    else:
        print("Auth failed:", result.get("error_description"))

# === Email Notification via Microsoft Graph ===
def send_email(to_email, subject, body):
    authority = "https://login.microsoftonline.com/common"
    scopes = ["Mail.Send"]

    app = PublicClientApplication(CLIENT_ID, authority=authority)
    accounts = app.get_accounts()
    result = app.acquire_token_silent(scopes, account=accounts[0]) if accounts else None

    if not result:
        result = app.acquire_token_interactive(scopes=scopes)

    if "access_token" in result:
        access_token = result["access_token"]
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": body
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": to_email
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }

        response = requests.post(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            headers=headers,
            json=message
        )

        if response.status_code == 202:
            print("Email sent successfully via Graph.")
        else:
            print("Graph API email send failed:", response.status_code, response.text)
    else:
        print("Authentication failed:", result.get("error_description"))

# === Load/Save CSV ===
def load_expenses():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, newline="", mode="r") as f:
        reader = csv.DictReader(f)
        return list(reader)

def save_expenses():
    with open(DATA_FILE, mode="w", newline="") as f:
        fieldnames = ["user", "master", "sub", "amount", "desc", "file", "status", "date", "approved_by", "admin_comment"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in expenses:
            writer.writerow(row)
    upload_to_onedrive(DATA_FILE, "expenses.csv")

def remove_duplicates_from_file():
    if not os.path.exists(DATA_FILE):
        return
    seen = set()
    unique_rows = []
    with open(DATA_FILE, newline="", mode="r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row_key = tuple(sorted(row.items()))
            if row_key not in seen:
                seen.add(row_key)
                unique_rows.append(row)

    with open(DATA_FILE, mode="w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=reader.fieldnames)
        writer.writeheader()
        writer.writerows(unique_rows)

# Remove duplicates at start
remove_duplicates_from_file()
expenses = load_expenses()

class BillingApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Billing App")
        self.root.geometry("700x500")
        self.root.configure(bg=LAVENDER_BG)
        self.username = tk.StringVar()
        self.password = tk.StringVar()
        self.role = tk.StringVar(value="User")
        self.build_login_screen()

    def build_login_screen(self):
        self.clear_root()
        tk.Label(self.root, text="Login", font=("Arial", 20, "bold"), bg=LAVENDER_BG, fg=TEXT_COLOR).pack(pady=20)
        tk.Label(self.root, text="Username", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        tk.Entry(self.root, textvariable=self.username).pack()
        tk.Label(self.root, text="Password", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        tk.Entry(self.root, textvariable=self.password, show="*").pack()
        tk.Label(self.root, text="Role", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        ttk.Combobox(self.root, values=["User", "Admin"], textvariable=self.role, state="readonly").pack()
        tk.Button(self.root, text="Login", bg=BTN_BG, fg=BTN_FG, command=self.handle_login).pack(pady=20)

    def handle_login(self):
        uname = self.username.get()
        pwd = self.password.get()
        role = self.role.get()
        if uname not in CREDENTIALS or CREDENTIALS[uname] != pwd:
            messagebox.showerror("Login Failed", "Invalid credentials")
            return
        self.current_user = uname
        if role == "User":
            self.build_user_form()
        else:
            self.build_admin_dashboard()

    def build_user_form(self):
        self.clear_root()
        tk.Label(self.root, text="Submit Expense", font=("Arial", 16, "bold"), bg=LAVENDER_BG, fg=TEXT_COLOR).pack(pady=10)
        self.master_category = tk.StringVar()
        self.sub_category = tk.StringVar()
        self.amount = tk.StringVar()
        self.description = tk.StringVar()
        self.proof_file = tk.StringVar()

        tk.Label(self.root, text="Master Category", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        master_options = ["Travel", "Office Supplies", "Utilities"]
        self.sub_options = {
            "Travel": ["Ticket Expense", "Food Expense", "Hospitality Expense"],
            "Office Supplies": ["Stationery", "Equipment"],
            "Utilities": ["Internet", "Electricity"]
        }
        master_cb = ttk.Combobox(self.root, values=master_options, textvariable=self.master_category, state="readonly")
        master_cb.pack()
        master_cb.bind("<<ComboboxSelected>>", self.update_subcategories)

        tk.Label(self.root, text="Subcategory", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        self.sub_cb = ttk.Combobox(self.root, textvariable=self.sub_category, state="readonly")
        self.sub_cb.pack()

        tk.Label(self.root, text="Amount", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        tk.Entry(self.root, textvariable=self.amount).pack()

        tk.Label(self.root, text="Description", bg=LAVENDER_BG, fg=TEXT_COLOR).pack()
        tk.Entry(self.root, textvariable=self.description).pack()

        tk.Button(self.root, text="Upload Proof", bg=BTN_BG, fg=BTN_FG, command=self.upload_proof).pack(pady=5)
        tk.Label(self.root, textvariable=self.proof_file, fg=TEXT_COLOR, bg=LAVENDER_BG).pack()

        tk.Button(self.root, text="Submit", bg=BTN_BG, fg=BTN_FG, command=self.submit_expense).pack(pady=10)
        tk.Button(self.root, text="Logout", command=self.build_login_screen, bg="#DDA0DD").pack()

    def update_subcategories(self, event):
        master = self.master_category.get()
        self.sub_cb['values'] = self.sub_options.get(master, [])
        self.sub_category.set("")

    def upload_proof(self):
        file_path = filedialog.askopenfilename(title="Select File")
        if file_path:
            self.proof_file.set(file_path)

    def submit_expense(self):
        entry = {
            "user": self.current_user,
            "master": self.master_category.get(),
            "sub": self.sub_category.get(),
            "amount": self.amount.get(),
            "desc": self.description.get(),
            "file": self.proof_file.get(),
            "status": "Pending",
            "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "approved_by": "",
            "admin_comment": ""
        }
        if entry in expenses:
            messagebox.showinfo("Duplicate", "This expense has already been submitted.")
            return
        expenses.append(entry)
        save_expenses()
        messagebox.showinfo("Success", "Expense submitted!")
        self.build_user_form()

    def build_admin_dashboard(self):
        self.clear_root()
        tk.Label(self.root, text="Admin Dashboard", font=("Arial", 16, "bold"), bg=LAVENDER_BG, fg=TEXT_COLOR).pack(pady=10)

        self.tree = ttk.Treeview(self.root, columns=("user", "master", "sub", "amount", "status"), show="headings")
        self.tree.pack(expand=True, fill="both")
        for col in self.tree["columns"]:
            self.tree.heading(col, text=col.capitalize())
        self.refresh_tree()

        tk.Label(self.root, text="Admin Comment:", bg=LAVENDER_BG, fg=TEXT_COLOR).pack(pady=(10, 0))
        self.admin_comment = tk.StringVar()
        tk.Entry(self.root, textvariable=self.admin_comment).pack(fill="x", padx=20)

        btn_frame = tk.Frame(self.root, bg=LAVENDER_BG)
        btn_frame.pack(pady=10)

        tk.Button(btn_frame, text="Preview Attachment", command=self.preview_attachment).pack(side="left", padx=5)
        tk.Button(btn_frame, text="Approve", bg="green", fg="white", command=lambda: self.update_status("Approved")).pack(side="left", padx=5)
        tk.Button(btn_frame, text="Reject", bg="red", fg="white", command=lambda: self.update_status("Rejected")).pack(side="left", padx=5)
        tk.Button(btn_frame, text="Logout", bg="#DDA0DD", command=self.build_login_screen).pack(side="left", padx=5)

    def refresh_tree(self):
        for i in self.tree.get_children():
            self.tree.delete(i)
        for exp in expenses:
            self.tree.insert("", "end", values=(exp["user"], exp["master"], exp["sub"], exp["amount"], exp["status"]))

    def preview_attachment(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showerror("Error", "No item selected.")
            return
        item_index = self.tree.index(selected[0])
        file_path = expenses[item_index]["file"]
        if file_path and os.path.exists(file_path):
            webbrowser.open(file_path)
        else:
            messagebox.showerror("Error", "File not found.")

    def update_status(self, new_status):
        selected = self.tree.selection()
        if not selected:
            messagebox.showerror("Error", "No item selected.")
            return
        item_index = self.tree.index(selected[0])
        expense = expenses[item_index]
        expense["status"] = new_status
        expense["approved_by"] = self.current_user
        expense["admin_comment"] = self.admin_comment.get()
        save_expenses()
        self.refresh_tree()
        self.admin_comment.set("")
        messagebox.showinfo("Updated", f"Expense {new_status.lower()}.")

        send_email(
            to_email="nehas@appglide.io",
            subject=f"Expense {new_status}",
            body=f"""Hello {expense['user']},\n\nYour expense submitted on {expense['date']} for {expense['amount']} has been {new_status.lower()}.\n\nComment from Admin: {expense['admin_comment']}\n\nCategory: {expense['master']} > {expense['sub']}\nDescription: {expense['desc']}\n\nRegards,\nBilling Team"""
        )

    def clear_root(self):
        for widget in self.root.winfo_children():
            widget.destroy()
        self.root.configure(bg=LAVENDER_BG)

# === Run the app ===
root = tk.Tk()
app = BillingApp(root)
root.mainloop()
