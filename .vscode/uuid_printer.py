import lldb

class RustUuidProvider(object):
    def __init__(self, valobj, internalDict):
        self.valobj = valobj

    def num_children(self): 
        return 1

    def get_child_index(self, name): 
        return 0

    def get_child_at_index(self, index):
        child_type = self.valobj.target.GetBasicType(lldb.eBasicTypeChar)
        byte_order = self.valobj.GetData().GetByteOrder()
        data = lldb.SBData.CreateDataFromCString(byte_order, child_type.GetByteSize(), self.build_decimal())
        return self.valobj.CreateValueFromData("Uuid", data, child_type.GetArrayType(data.GetByteSize()))
            
    def update(self): 
        return True

    def has_children(self): 
        return True

    def build_decimal(self):
        array = self.valobj.GetChildAtIndex(0)
        result = ''
        for i in range(16):
            result += "%0.2x" % int(array.GetChildAtIndex(i).GetValueAsUnsigned())
            if i in [4, 6, 8, 10]:
                result += '-'
        return result



def __lldb_init_module(debugger, dict):
    debugger.HandleCommand('type synthetic add -x "Uuid" --python-class uuid_printer.RustUuidProvider -w Rust')
        